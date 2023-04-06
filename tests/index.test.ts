import { test, expect } from 'playwright-test-coverage';
import { type Page, JSHandle, ConsoleMessage } from '@playwright/test';
import { LogAliasFn, LogLevel, Logger } from '../src/index';
import { UncertianPromiseResult, UncertianPromiseResultSuccess, UncertianResultFailure } from './types/UncertianPromise';

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

async function runFnAndGatherConsoleEventsForDuration<T>(page: Page, fn: () => T | Promise<T>, duration: number, {
    specificMessage,
    additionalMessagesToIgnore = [],
    args
}: Partial<{
    /** filter for a specific console message */
    specificMessage: string,
    /** filter for a specific console messages */
    additionalMessagesToIgnore: string[],
    /** additional data to pass to {@link fn} as an argument */
    args: T
}> = {}): Promise<ConsoleEventData[]> {
    const consoleEventsPromise = gatherConsoleEventsForDuration(page, duration, {
        specificMessage,
        additionalMessagesToIgnore
    });
    page.evaluate(fn, args);

    return await consoleEventsPromise;
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
    page.waitForEvent('console', consoleEventListener)
        .catch(err => { });

    await wait(duration);
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


test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:3000');
});

test('logs a "hello world" message', async ({ page }) => {
    const consoleEvents = await runFnAndGatherConsoleEventsForDuration(page, () => {
        let logger = new window.Logger();
        logger.log('info', 'hello world');
    }, 100);

    expect(consoleEvents.length).toBe(1);
    expect(consoleEvents[0].msg).toBe('[info] hello world');
});

test('logs a "hello world" message with a "root" prefix', async ({ page }) => {
    const consoleEvents = await runFnAndGatherConsoleEventsForDuration(page, () => {
        let logger = new window.Logger('root');
        logger.log('info', 'hello world');
    }, 100);

    expect(consoleEvents.length).toBe(1);
    expect(consoleEvents[0].msg).toBe('[info > root] hello world');
});

test('logs a "hello world" message with prefixes "root" and "foo"', async ({ page }) => {
    const consoleEvents = await runFnAndGatherConsoleEventsForDuration(page, () => {
        let logger = new window.Logger(['root', 'foo']);
        logger.log('info', 'hello world');
    }, 100);
    
    expect(consoleEvents.length).toBe(1);
    expect(consoleEvents[0].msg).toBe('[info > root > foo] hello world');
});


test('logs a "hello world" message with a "warn" log level', async ({ page }) => {
    const consoleEvents = await runFnAndGatherConsoleEventsForDuration(page, () => {
        let logger = new window.Logger();
        logger.log('warn', 'hello world');
    }, 100);

    expect(consoleEvents.length).toBe(1);
    expect(consoleEvents[0].msg).toBe('[warn] hello world');
});

test.describe('logging a "hello world" message with varying log levels with logDebug(), logXxxx() methods', () => {
    test('logDebug() logs using "debug" log level', async ({ page }) => {
        const consoleEvents = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.logDebug('hello world');
        }, 100);

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe(`[debug] hello world`);
    });
    
    test('logInfo() logs using "info" log level', async ({ page }) => {
        const consoleEvents = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.logInfo('hello world');
        }, 100);

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe(`[info] hello world`);
    });

    test('logWarn() logs using "warn" log level', async ({ page }) => {
        const consoleEvents = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.logWarn('hello world');
        }, 100);

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe(`[warn] hello world`);
    });

    test('logError() logs using "error" log level', async ({ page }) => {
        const consoleEvents = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.logError('hello world');
        }, 100);

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe(`[error] hello world`);
    });
});

test.describe('logging a "hello world" message with "additional" data', () => {
    test('logging both "main" message and "additinal" as string, when "additional" is string "foo and bar"', async ({ page }) => {
        const expectedMainMsg = '[info] hello world';
        const expectedAdditionalMessageParts = ['[info] дополнительные данные:\n', 'foo and bar'];

        const consoleEvents = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', {
                additional: 'foo and bar'
            });
        }, 100);
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

    test('logging both "main" message and "additinal" as object, when "additional" is object "{ foo: "and bar" }"', async ({ page }) => {
        const expectedMainMsg = '[info] hello world';
        const expectedAdditionalMessageParts = ['[info] дополнительные данные:\n', { foo: "and bar" }];

        const consoleEvents = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', {
                additional: { foo: "and bar" }
            });
        }, 100);
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

        const consoleEvents = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', {
                additional: undefined
            });
        }, 100);
        const mainMessageData = consoleEvents[0];

        expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(1);
        expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMsg);
    });

    test('logging both "main" message and "additinal" when: (1) "additional" is "undefined" & (2) "alwaysLogAdditional" is "true"', async ({ page }) => {
        const expectedMainMsg = '[info] hello world';
        const expectedAdditionalMessageParts = ['[info] дополнительные данные:\n', undefined];

        const consoleEvents = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', {
                additional: undefined,
                alwaysLogAdditional: true
            });
        }, 100);
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

    test('logging both "main" message and "additinal" as string, when: (1) "additional" is object "{ foo: "and bar" }" and (2) "stringifyAdditional" is "true" (checking for pretty w/ 2 spaces)', async ({ page }) => {
        const expectedMainMsg = '[info] hello world';
        const expectedAdditionalMessageParts = ['[info] дополнительные данные:\n', JSON.stringify({ foo: "and bar" }, null, 2)];

        const consoleEvents = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', {
                additional: { foo: "and bar" },
                stringifyAdditional: true
            });
        }, 100);
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

    test('"additional" object "{ foo: "and bar" }" is logged as a string when "stringifyAdditional" setting is true', async ({ page }) => {
        const expectedMainMsg = '[info] hello world';
        const additionalData = { foo: 'and bar' };

        const additionalMsgEventDataResult = await runFnAndWaitForConsoleEvent(page, ({ additionalData }) => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', {
                additional: additionalData,
                stringifyAdditional: true
            });
        }, { additionalMessagesToIgnore: [expectedMainMsg], args: { additionalData } });
        const additionalMsgEventData = (additionalMsgEventDataResult as Exclude<typeof additionalMsgEventDataResult, UncertianResultFailure>).result;

        const additionalMsg = additionalMsgEventDataResult.success ? await additionalMsgEventData.args[0]!.jsonValue() : null;
        const additionalMsgObject = additionalMsgEventDataResult.success ? await additionalMsgEventData.args[1]! .jsonValue() : null;

        expect(additionalMsgEventDataResult.success).toBe(true);
        expect(additionalMsg).toBe('[info] дополнительные данные:\n');
        expect(typeof additionalMsgObject === 'string').toBe(true);
        expect(JSON.parse(additionalMsgObject)).toEqual(JSON.parse(JSON.stringify(additionalData)));
    });
});