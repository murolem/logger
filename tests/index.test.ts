// import { test, expect } from 'playwright-test-coverage';
import { test, expect, type Page, JSHandle, ConsoleMessage } from '@playwright/test';
import { LogAliasFn, LogLevel, Logger } from '../src/index';
import { UncertianPromiseResult, UncertianPromiseResultSuccess, UncertianResultFailure } from './types/UncertianPromise';
import libCoverage from 'istanbul-lib-coverage';
import libReport from 'istanbul-lib-report';
import reports from 'istanbul-reports';
import v8toIstanbul from 'v8-to-istanbul';
import fs from 'fs-extra';
import path from 'path';


const utilityFunctionsTimeout = 3000;

class TimeoutError extends Error {
    constructor(msg?: string) {
        super(msg);
    }
}

// Logger is made available throught the index.html file by exposing its class in the `window` object.
declare global {
    interface Window {
        Logger: typeof Logger
    }
}

/**
 * Console messages to ignore in `console` events completely. 
 */
const consoleMessagesToIgnore = [
    '[vite] connected.', // printed when vite server is started
    'Failed to load resource: the server responded with a status of 404 (Not Found)' // printed for missing favicon (im not adding one)
];

/**
 * Data of a console event (`console.log()` and such). 
 */
type ConsoleEventData = {
    msg: string,
    args: JSHandle[],
    type: string
}

async function wait(duration: number) {
    return new Promise((resolve) => setTimeout(resolve, duration));
}

async function runFnAndGatherConsoleEventsForDuration<T extends any, A extends Record<string, any>>(page: Page, fn: (arg: A) => T | Promise<T>, duration: number, {
    specificMessage,
    additionalMessagesToIgnore = [],
    args,
}: Partial<{
    /** filter for a specific console message */
    specificMessage: string,
    /** filter for a specific console messages */
    additionalMessagesToIgnore: string[],
    /** additional data to pass to {@link fn} as an argument */
    args: A
}> = {}): Promise<{ consoleEventsPromise: Promise<ConsoleEventData[]>, pageFnRunnerPromise: Promise<T> }> {
    const consoleEventsPromise = gatherConsoleEventsForDuration(page, duration, {
        specificMessage,
        additionalMessagesToIgnore
    });
    // @ts-ignore i dont understand you typescript
    const pageFnRunnerPromise = page.evaluate(fn, args);

    return { consoleEventsPromise, pageFnRunnerPromise };
}

async function gatherConsoleEventsForDuration(page: Page, duration: number, {
    specificMessage,
    additionalMessagesToIgnore = [],
}: Partial<{
    /** filter for a specific console message */
    specificMessage: string,
    /** filter for a specific console messages */
    additionalMessagesToIgnore: string[]
}> = {}): Promise<ConsoleEventData[]> {
    const consoleEventDataRecords: ConsoleEventData[] = [];

    const consoleEventListener = async (e: ConsoleMessage) => {
        const msg = e.text();
        const type = e.type();
        const args = e.args();

        const isBlacklisted = consoleMessagesToIgnore.includes(msg) || additionalMessagesToIgnore.includes(msg);
        if (isBlacklisted)
            return false;

        const isSpecificMessageSet = !!specificMessage;
        if (isSpecificMessageSet && msg !== specificMessage)
            return false;

        consoleEventDataRecords.push({ msg, type, args });

        return false;
    }
    page.addListener('console', consoleEventListener);

    await wait(duration)
    // .catch(err => { throw new Error('got an error: ' + err)});
    page.removeListener('console', consoleEventListener);

    return consoleEventDataRecords;
}

/**
 * Attaches a listener for {@link page} console events, then runs the function {@link fn} within the {@link page} context.
 * 
 * **Note:** {@link page} context is isolated, meaning function {@link fn} should not have any references to the context of this script. 
 * Data can be passed as an argument to function {@link fn} by using {@link args} variable.
 * 
 * Listener is configured to listen to messages that meet **all** these conditions:
 * - Message is not in {@link consoleMessagesToIgnore} or {@link additionalMessagesToIgnore} (if defined)
 * - Message is equal to {@link specificMessage} (if defined)
 * 
 * If no matching event happened within the `timeout` ms, the promise is rejected.
 * 
 * @param page a browser page
 * @param fn a function to run within the {@link page} context
 */
async function runFnAndWaitForConsoleEvent<T extends any>(page: Page, fn: (args: T) => void, {
    timeout = utilityFunctionsTimeout,
    specificMessage,
    additionalMessagesToIgnore = [],
    args,
}: Partial<{
    /** how much time in ms to wait before rejecting */
    timeout: number,
    /** filter for a specific console message */
    specificMessage: string,
    /** filter for a specific console messages */
    additionalMessagesToIgnore: string[]
    /** additional data to pass to {@link fn} as an argument */
    args: T
}> = {}): UncertianPromiseResult<ConsoleEventData> {
    const consoleEventPromise = waitForConsoleEvent(page, { timeout, specificMessage, additionalMessagesToIgnore });
    await page.evaluate(fn as any, args);

    const consoleEventResult = await consoleEventPromise;

    return consoleEventResult;
}

/**
 * Waits for a {@link page} console event matching given conditions, then returns the event data.
 * 
 * Listener is configured to listen to messages that meet **all** these conditions:
 * - Message is not in {@link consoleMessagesToIgnore} or {@link additionalMessagesToIgnore} (if defined)
 * - Message is equal to {@link specificMessage} (if defined)
 * 
 * If no matching event happened within the `timeout` ms, the promise is rejected.
 * 
 * @param page a browser page
 */
async function waitForConsoleEvent(page: Page, {
    timeout = utilityFunctionsTimeout,
    specificMessage,
    additionalMessagesToIgnore = []
}: Partial<{
    timeout: number,
    specificMessage: string,
    additionalMessagesToIgnore: string[]
}> = {}): UncertianPromiseResult<ConsoleEventData> {
    const consoleEventResult = await runAsyncFnWithTimeout(async () => {
        const consoleEventPromise = page.waitForEvent('console', {
            async predicate(msgPromise) {
                const msg = (await msgPromise).text();

                const isBlacklisted = consoleMessagesToIgnore.includes(msg) || additionalMessagesToIgnore.includes(msg);
                if (isBlacklisted)
                    return false;

                const isSpecificMessageSet = !!specificMessage;
                if (isSpecificMessageSet)
                    return msg === specificMessage;

                return true;
            }
        });

        return consoleEventPromise;
    }, timeout)
        .then(({ result }) => ({
            success: true as const,
            result: {
                msg: result.text(),
                args: result.args(),
                type: result.type()
            }
        }))
        .catch(r => {
            const { success, reason } = r;
            if (success === false && reason instanceof TimeoutError)
                return {
                    success: false as const,
                    reason: `timeout (${timeout} ms) while waiting for a console event`
                };
            else
                throw new Error(r);
        });

    return consoleEventResult;
}

/**
 * Runs given async function {@link fn} until it's done or time {@link timeout} runs out. 
 * 
 * @param fn an asynchronoys function to execute
 * @param timeout a time constrain for a function execution
 */
async function runAsyncFnWithTimeout<T>(fn: () => Promise<T>, timeout = utilityFunctionsTimeout): UncertianPromiseResultSuccess<T> {
    const fnPromise = fn();

    let resolveTimeoutPromise, timeoutHandle;
    const timeoutPromise = new Promise<TimeoutError>((resolve, reject) => {
        resolveTimeoutPromise = resolve;

        timeoutHandle = setTimeout(() => {
            resolve(new TimeoutError(`timeout (${timeout} ms) while evaluating an async function`));
        }, timeout);
    });

    const actionResult = await Promise.race([fnPromise, timeoutPromise]);
    if (actionResult instanceof TimeoutError)
        return Promise.reject({ success: false, reason: actionResult });
    else {
        clearTimeout(timeoutHandle);
        resolveTimeoutPromise();

        return { success: true, result: actionResult as T };
    }
}

function getCoverageGatherer() {
    const cwd = process.cwd();
    const coverageMap = libCoverage.createCoverageMap();

    return {
        async gatherCoverageForPage(page: Page) {
            const coverage = await page.coverage.stopJSCoverage();
            for (const entry of coverage) {
                if (entry.url === '')
                    continue;

                const scriptPath = path.join(cwd, new URL(entry.url).pathname);
                const converter = v8toIstanbul(scriptPath, 0, { source: entry.source! }, (filepath) => {
                    const normalized = filepath.replace(/\\/g, '/');
                    const ret = normalized.includes('node_modules/');
                    return ret;
                });

                await converter.load();
                converter.applyCoverage(entry.functions);

                const data = converter.toIstanbul();
                coverageMap.merge(data);
            }
        },
        async saveCoverage() {
            // await fs.remove('coverage');
            const context = libReport.createContext({ coverageMap });
            reports.create('html').execute(context);
        }
    }
}

/**
 * 
 * thanks https://github.com/microsoft/playwright/discussions/14415#discussioncomment-2977900
 * @param page 
 */
async function saveV8Coverage(page: Page): Promise<void> {
    const cwd = process.cwd();

    const coverage = await page.coverage.stopJSCoverage();
    const map = libCoverage.createCoverageMap();
    for (const entry of coverage) {
        if (entry.url === '')
            continue;

        const scriptPath = path.join(cwd, new URL(entry.url).pathname);
        const converter = v8toIstanbul(scriptPath, 0, { source: entry.source! }, (filepath) => {
            const normalized = filepath.replace(/\\/g, '/');
            const ret = normalized.includes('node_modules/');
            return ret;
        });

        await converter.load();
        converter.applyCoverage(entry.functions);

        const data = converter.toIstanbul();
        map.merge(data);
    }
    await fs.rm('coverage', { force: true, recursive: true });
    const context = libReport.createContext({ coverageMap: map });
    reports.create('html').execute(context);
}

let { gatherCoverageForPage, saveCoverage } = getCoverageGatherer();
test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:3000');

    // await page.evaluate(async (loggerAsStr) => {
    //     // @ts-ignore
    //     window.Logger = loggerAsStr;
    // }, Logger.toString());

    await page.coverage.startJSCoverage();
});

test.afterEach(async ({ page }, workerInfo) => {
    // coverage is collected only when 1 worker is used
    if (workerInfo.config.workers === 1)
        await gatherCoverageForPage(page);
});

test.afterAll(async ({ }, workerInfo) => {
    // coverage is collected only when 1 worker is used
    if (workerInfo.config.workers === 1)
        await saveCoverage();
});


test('logs a "hello world" message', async ({ page }) => {
    const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
        let logger = new window.Logger();
        logger.log('info', 'hello world');
    }, 100);
    const consoleEvents = await consoleEventsPromise;

    expect(consoleEvents.length).toBe(1);
    expect(consoleEvents[0].msg).toBe('[info] hello world');
});

test.describe('prefixes', () => {
    test('logs a "hello world" message with a "root" prefix', async ({ page }) => {
        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger('root');
            logger.log('info', 'hello world');
        }, 100);
        const consoleEvents = await consoleEventsPromise;

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe('[info | root] hello world');
    });

    test('logs a "hello world" message with prefixes "root" and "foo"; prefixed are given as an array', async ({ page }) => {
        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger('root', 'foo');
            logger.log('info', 'hello world');
        }, 100);
        const consoleEvents = await consoleEventsPromise;

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe('[info | root > foo] hello world');
    });
});

test.describe('log levels', () => {
    test('logs a "hello world" message with a "warn" log level', async ({ page }) => {
        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('warn', 'hello world');
        }, 100);
        const consoleEvents = await consoleEventsPromise;

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe('[warn] hello world');
    });

    test('logDebug() logs using "debug" log level', async ({ page }) => {
        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.logDebug('hello world');
        }, 100);
        const consoleEvents = await consoleEventsPromise;

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe(`[debug] hello world`);
    });

    test('logInfo() logs using "info" log level', async ({ page }) => {
        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.logInfo('hello world');
        }, 100);
        const consoleEvents = await consoleEventsPromise;

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe(`[info] hello world`);
    });

    test('logWarn() logs using "warn" log level', async ({ page }) => {
        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.logWarn('hello world');
        }, 100);
        const consoleEvents = await consoleEventsPromise;

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe(`[warn] hello world`);
    });

    test('logError() logs using "error" log level', async ({ page }) => {
        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.logError('hello world');
        }, 100);
        const consoleEvents = await consoleEventsPromise;

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe(`[error] hello world`);
    });
})

test.describe('passing additional data', () => {
    test('logging "main" message and "additinal" as string, when "additional" is string "foo and bar"', async ({ page }) => {
        const expectedMainMsg = '[info] hello world';
        const expectedAdditionalMessageParts = ['[info] дополнительные данные:\n', 'foo and bar'];

        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', {
                additional: 'foo and bar'
            });
        }, 100);
        const consoleEvents = await consoleEventsPromise;
        const mainMessageData = consoleEvents[0];
        const additionalMessageData = consoleEvents[1];

        expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(2);
        expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMsg);
        expect(additionalMessageData.args.length, 'additional message should be logged as 2 parts').toBe(2);

        const additionalMessageArgs = await Promise.all([
            additionalMessageData.args[0].jsonValue(),
            additionalMessageData.args[1].jsonValue()
        ]);

        expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
        expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toBe(expectedAdditionalMessageParts[1]);
    });

    test('logging "main" message and "additinal" as object, when "additional" is object "{ foo: "and bar" }"', async ({ page }) => {
        const expectedMainMsg = '[info] hello world';
        const expectedAdditionalMessageParts = ['[info] дополнительные данные:\n', { foo: "and bar" }];

        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', {
                additional: { foo: "and bar" }
            });
        }, 100);
        const consoleEvents = await consoleEventsPromise;
        const mainMessageData = consoleEvents[0];
        const additionalMessageData = consoleEvents[1];

        expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(2);
        expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMsg);
        expect(additionalMessageData.args.length, 'additional message should be logged as 2 parts').toBe(2);

        const additionalMessageArgs = await Promise.all([
            additionalMessageData.args[0].jsonValue(),
            additionalMessageData.args[1].jsonValue()
        ]);

        expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
        expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toEqual(expectedAdditionalMessageParts[1]);
    });

    test('logging only "main" message when "additional" is "undefined"', async ({ page }) => {
        const expectedMainMsg = '[info] hello world';

        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', {
                additional: undefined
            });
        }, 100);
        const consoleEvents = await consoleEventsPromise;
        const mainMessageData = consoleEvents[0];

        expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(1);
        expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMsg);
    });

    test('logging "main" message and "additinal" when: (1) "additional" is "undefined" & (2) "alwaysLogAdditional" is "true"', async ({ page }) => {
        const expectedMainMsg = '[info] hello world';
        const expectedAdditionalMessageParts = ['[info] дополнительные данные:\n', undefined];

        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', {
                additional: undefined,
                alwaysLogAdditional: true
            });
        }, 100);
        const consoleEvents = await consoleEventsPromise;
        const mainMessageData = consoleEvents[0];
        const additionalMessageData = consoleEvents[1];

        expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(2);
        expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMsg);
        expect(additionalMessageData.args.length, 'additional message should be logged as 2 parts').toBe(2);

        const additionalMessageArgs = await Promise.all([
            additionalMessageData.args[0].jsonValue(),
            additionalMessageData.args[1].jsonValue()
        ]);

        expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
        expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toEqual(expectedAdditionalMessageParts[1]);
    });

    test('logging "main" message and "additinal" as string (prettified, with 2 spaces), when: (1) "additional" is object "{ foo: "and bar" }" and (2) "stringifyAdditional" is "true"', async ({ page }) => {
        const expectedMainMsg = '[info] hello world';
        const expectedAdditionalMessageParts = ['[info] дополнительные данные:\n', JSON.stringify({ foo: "and bar" }, null, 2)];

        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', {
                additional: { foo: "and bar" },
                stringifyAdditional: true
            });
        }, 100);
        const consoleEvents = await consoleEventsPromise;
        const mainMessageData = consoleEvents[0];
        const additionalMessageData = consoleEvents[1];

        expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(2);
        expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMsg);
        expect(additionalMessageData.args.length, 'additional message should be logged as 2 parts').toBe(2);

        const additionalMessageArgs = await Promise.all([
            additionalMessageData.args[0].jsonValue(),
            additionalMessageData.args[1].jsonValue()
        ]);

        expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
        expect(additionalMessageArgs[1], 'second part of additional should be additional itself (prettified, with 2 spaces)').toEqual(expectedAdditionalMessageParts[1]);
    });
});

test.describe('throwing errors', () => {
    test('no error is thrown when "throwErr" is undefined or false; "main" message "hello world" and "additional" message "foo and bar" are logging', async ({ page }) => {
        const expectedMainMsg = '[info] hello world';
        const expectedAdditionalMessageParts = ['[info] дополнительные данные:\n', 'foo and bar'];

        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', {
                additional: 'foo and bar',
                throwErr: false
            });
            logger.log('info', 'hello world', {
                additional: 'foo and bar',
                throwErr: undefined
            });
        }, 100);
        const consoleEvents = await consoleEventsPromise;

        expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(4);

        for (let i = 0; i <= 2; i += 2) {
            const mainMessageData = consoleEvents[i];
            const additionalMessageData = consoleEvents[i + 1];

            expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMsg);
            expect(additionalMessageData.args.length, 'additional message should be logged as 2 parts').toBe(2);

            const additionalMessageArgs = await Promise.all([
                additionalMessageData.args[0].jsonValue(),
                additionalMessageData.args[1].jsonValue()
            ]);

            expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
            expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toBe(expectedAdditionalMessageParts[1]);
        }
    });


    test('error is thrown when "throwErr" is true with text of "main" message; "main" message is not logging, but "additional" is', async ({ page }) => {
        const expectedErrorMessage = 'Error: [error] hello world';
        const expectedAdditionalMessageParts = ['[error] дополнительные данные:\n', 'foo and bar'];

        const { consoleEventsPromise, pageFnRunnerPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();

            logger.log('error', 'hello world', {
                additional: 'foo and bar',
                throwErr: true
            });
        }, 100);
        await (expect(pageFnRunnerPromise, 'error message should include the expected message')).rejects.toThrow(expectedErrorMessage);

        const consoleEvents = await consoleEventsPromise;
        const additionalMessageData = consoleEvents[0];

        expect(consoleEvents.length).toBe(1);
        expect(additionalMessageData.args.length).toBe(2);

        const additionalMessageArgs = await Promise.all([
            additionalMessageData.args[0].jsonValue(),
            additionalMessageData.args[1].jsonValue()
        ]);

        expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
        expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toBe(expectedAdditionalMessageParts[1]);
    });

    test('error is thrown when "throwErr" is of type Error — that Error itself will be thrown — after "main" message and "additional"', async ({ page }) => {
        const expectedMainMessage = '[error] hello world';
        const expectedAdditionalMessageParts = ['[error] дополнительные данные:\n', 'foo and bar'];
        const expectedErrorMessage = 'Error: [error] this is an error'

        const { consoleEventsPromise, pageFnRunnerPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();

            logger.log('error', 'hello world', {
                additional: 'foo and bar',
                throwErr: new Error('this is an error')
            });
        }, 100);
        await (expect(pageFnRunnerPromise, 'error message should include the expected message')).rejects.toThrow(expectedErrorMessage);

        const consoleEvents = await consoleEventsPromise;
        const mainMessageData = consoleEvents[0];
        const additionalMessageData = consoleEvents[1];

        expect(consoleEvents.length).toBe(2);
        expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMessage);
        expect(additionalMessageData.args.length).toBe(2);

        const additionalMessageArgs = await Promise.all([
            additionalMessageData.args[0].jsonValue(),
            additionalMessageData.args[1].jsonValue()
        ]);

        expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
        expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toBe(expectedAdditionalMessageParts[1]);
    });

    test('error is thrown when "throwErr" is a string with text of that string — after "main" message and "additional"', async ({ page }) => {
        const expectedMainMessage = '[error] hello world';
        const expectedAdditionalMessageParts = ['[error] дополнительные данные:\n', 'foo and bar'];
        const expectedErrorMessage = 'Error: [error] this is an error'

        const { consoleEventsPromise, pageFnRunnerPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();

            logger.log('error', 'hello world', {
                additional: 'foo and bar',
                throwErr: 'this is an error'
            });
        }, 100);
        await (expect(pageFnRunnerPromise, 'error message should include the expected message')).rejects.toThrow(expectedErrorMessage);

        const consoleEvents = await consoleEventsPromise;
        const mainMessageData = consoleEvents[0];
        const additionalMessageData = consoleEvents[1];

        expect(consoleEvents.length).toBe(2);
        expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMessage);
        expect(additionalMessageData.args.length).toBe(2);

        const additionalMessageArgs = await Promise.all([
            additionalMessageData.args[0].jsonValue(),
            additionalMessageData.args[1].jsonValue()
        ]);

        expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
        expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toBe(expectedAdditionalMessageParts[1]);
    });
});

test.describe('cloning', () => {
    test('just cloning an instance with multiple prefixes', async ({ page }) => {
        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger('root', 'foo')
                .clone();
            logger.log('info', 'hello world');
        }, 100);
        const consoleEvents = await consoleEventsPromise;

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe('[info | root > foo] hello world');
    });

    test('cloning and appending a prefix', async ({ page }) => {
        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger('root')
                .cloneAndAppendPrefix('foo');
            logger.log('info', 'hello world');
        }, 100);
        const consoleEvents = await consoleEventsPromise;

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe('[info | root > foo] hello world');
    });

    test('cloning and appending multiple prefixes', async ({ page }) => {
        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger('root')
                .cloneAndAppendPrefix('foo', 'bar');
            logger.log('info', 'hello world');
        }, 100);
        const consoleEvents = await consoleEventsPromise;

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe('[info | root > foo > bar] hello world');
    });
});

test.describe('alerts', () => {
    test('alert "hello world" messsage when `alertMsg` is true, also logging it to console', async ({ page }) => {
        const expectedMainMessage = '[info] hello world';
        const expectedAlertMessage = expectedMainMessage;

        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', {
                alertMsg: true
            });
        }, 100);
        page.on('dialog', async (dialog) => {
            const type = dialog.type();
            const msg = dialog.message();

            expect(type).toBe('alert');
            expect(msg).toBe(expectedAlertMessage);

            await dialog.accept();
        });
        const consoleEvents = await consoleEventsPromise;

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe(expectedMainMessage);
    });

    test('alert "hello world" messsage and a little note saying there is additional data in console, when `alertMsg` is true, also logging it and additional string "some additional data" to console', async ({ page }) => {
        const expectedMainMessage = '[info] hello world';
        const expectedAdditionalMessageParts = ['[info] дополнительные данные:\n', 'some additional data'];
        const expectedAlertMessage = '[info] hello world'
            + '\n\n(см. дополнительные данные в консоли)';

        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', {
                additional: 'some additional data',
                alertMsg: true
            });
        }, 100);
        page.on('dialog', async (dialog) => {
            const type = dialog.type();
            const msg = dialog.message();
            
            expect(type).toBe('alert');
            expect(msg).toBe(expectedAlertMessage);

            await dialog.accept();
        });
        const consoleEvents = await consoleEventsPromise;

        const mainMessageData = consoleEvents[0];
        const additionalMessageData = consoleEvents[1];
        expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(2);
        expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMessage);
        expect(additionalMessageData.args.length, 'additional message should be logged as 2 parts').toBe(2);

        const additionalMessageArgs = await Promise.all([
            additionalMessageData.args[0].jsonValue(),
            additionalMessageData.args[1].jsonValue()
        ]);

        expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
        expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toEqual(expectedAdditionalMessageParts[1]);
    });


    test('alert "hello world" messsage and a little note saying there is additional data + an error in console, when `alertMsg` is true, also logging it and additional string "some additional data" to console, then throwing an error', async ({ page }) => {
        const expectedMainMessage = '[info] hello world';
        const expectedAdditionalMessageParts = ['[info] дополнительные данные:\n', 'some additional data'];
        const expectedErrorMessage = 'this is an error 🤓🤓';
        const expectedAlertMessage = '[info] hello world'
            + '\n\n(см. дополнительные данные в консоли)'
            + '\n(см. сообщение об ошибке в консоли)';

        const { consoleEventsPromise, pageFnRunnerPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', {
                additional: 'some additional data',
                throwErr: 'this is an error 🤓🤓',
                alertMsg: true
            });
        }, 100);
        page.on('dialog', async (dialog) => {
            const type = dialog.type();
            const msg = dialog.message();
            
            expect(type).toBe('alert');
            expect(msg).toBe(expectedAlertMessage);

            await dialog.accept();
        });
        await (expect(pageFnRunnerPromise, 'error message should include the expected message')).rejects.toThrow(expectedErrorMessage);
        const consoleEvents = await consoleEventsPromise;

        const mainMessageData = consoleEvents[0];
        const additionalMessageData = consoleEvents[1];
        expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(2);
        expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMessage);
        expect(additionalMessageData.args.length, 'additional message should be logged as 2 parts').toBe(2);

        const additionalMessageArgs = await Promise.all([
            additionalMessageData.args[0].jsonValue(),
            additionalMessageData.args[1].jsonValue()
        ]);

        expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
        expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toEqual(expectedAdditionalMessageParts[1]);
    });
});