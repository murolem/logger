import { test, expect, type Page, JSHandle, ConsoleMessage } from '@playwright/test';
import libCoverage from 'istanbul-lib-coverage';
import libReport from 'istanbul-lib-report';
import reports from 'istanbul-reports';
import v8toIstanbul from 'v8-to-istanbul';
import path from 'path';
import randomString from 'crypto-random-string';
import Logger from '$src';
import dotenv from 'dotenv';
// read env variables
dotenv.config();

const consoleListeningDurationMs = 750; // will fail if not enough time is provided

/**
 * Console messages to ignore in console events. 
 */
const consoleMessagesToIgnore = [
    '[vite] connected.', // printed when vite server is started (i.e. when each test is run)
    'Failed to load resource: the server responded with a status of 404 (Not Found)' // printed because of missing favicon (im not adding one)
];


// Logger is made available throught the index.html file by exposing its class in the `window` object.
declare global {
    interface Window {
        Logger: typeof Logger
    }
}

const { startGatheringCoverage, finishGatheringCoverage, generateAndSaveCoverageReport } = getCoverageGatherer();
test.beforeEach(async ({ page, browserName }) => {
    await page.goto('http://127.0.0.1:3000');

    if (process.env.COVERAGE && browserName === 'chromium')
        await startGatheringCoverage(page);

    await exposeDebugFunctionToPage(page, false);
});

test.afterEach(async ({ page, browserName }) => {
    // stop collection coverage
    if (process.env.COVERAGE && browserName === 'chromium')
        await finishGatheringCoverage(page);
});

test.afterAll(async ({ browserName }) => {
    // save coverage data 
    if (process.env.COVERAGE && browserName === 'chromium')
        await generateAndSaveCoverageReport();
});

test('logs a "hello world" message', async ({ page }) => {
    const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
        let logger = new window.Logger();
        logger.log('info', 'hello world');
    }, consoleListeningDurationMs);
    const consoleEvents = await consoleEventsPromise;

    expect(consoleEvents.length).toBe(1);
    expect(consoleEvents[0].msg).toBe('[info] hello world');
});

test('logs a "hello world" message when destructured', async ({ page }) => {
    const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
        let { log } = new window.Logger();
        log('info', 'hello world');
    }, consoleListeningDurationMs);
    const consoleEvents = await consoleEventsPromise;

    expect(consoleEvents.length).toBe(1);
    expect(consoleEvents[0].msg).toBe('[info] hello world');
});

test.describe('different types of main message', () => {
    test('logs a "[1,\'hello\',[object Object]]" message when logging an array "[1,\'hello\', { beep: \'boop\' }]" as main message (just as-is)', async ({ page }) => {
        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', [1, 'hello', { beep: 'boop' }]);
        }, consoleListeningDurationMs);
        const consoleEvents = await consoleEventsPromise;

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe('[info] 1,hello,[object Object]');
    });

    test('logs a "() => \'hello world\'" message when logging a "() => \'hello world\'" function as main message (just as-is)', async ({ page }) => {
        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', () => 'hello world');
        }, consoleListeningDurationMs);
        const consoleEvents = await consoleEventsPromise;

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe('[info] () => \'hello world\'');
    });

    test('logs a "[object Object]" message when logging a "{ beep: \'boop\' }" object as main message (just as-is)', async ({ page }) => {
        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', { beep: 'boop' });
        }, consoleListeningDurationMs);
        const consoleEvents = await consoleEventsPromise;

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe('[info] [object Object]');
    });
});

test.describe('prefixes', () => {
    test('logs a "hello world" message with a "root" prefix', async ({ page }) => {
        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger('root');
            logger.log('info', 'hello world');
        }, consoleListeningDurationMs);
        const consoleEvents = await consoleEventsPromise;

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe('[info | root] hello world');
    });

    test('logs a "hello world" message with prefixes "root" and "foo"; prefixed are given as an array', async ({ page }) => {
        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger('root', 'foo');
            logger.log('info', 'hello world');
        }, consoleListeningDurationMs);
        const consoleEvents = await consoleEventsPromise;

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe('[info | root > foo] hello world');
    });
});

test.describe('log levels', () => {
    test('logs a "hello world" message with a "warn" log level, "additional" "{ foo: 123 }" as string using "params" "{ stringifyAdditional: true }"', async ({ page }) => {
        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('warn', 'hello world');
        }, consoleListeningDurationMs);
        const consoleEvents = await consoleEventsPromise;

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe('[warn] hello world');
    });
});

test.describe('aliases', () => {
    test('logDebug() prints "hello world" using "debug" log level, "additional" "{ foo: 123 }" as string using "params" "{ stringifyAdditional: true }"', async ({ page }) => {
        const expectedMainMsg = '[debug] hello world';
        const expectedAdditionalMessageParts = ['[debug] additional data:\n', JSON.stringify({ foo: 123 }, null, 2)];

        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let { logDebug } = new window.Logger();
            logDebug('hello world', { 
                additional: { foo: 123 },
                stringifyAdditional: true 
            });
            logDebug('hello world', { foo: 123 }, { stringifyAdditional: true });
        }, consoleListeningDurationMs);
        const consoleEvents = await consoleEventsPromise;
        expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(4);

        for (let i = 0; i < 2; i++) {
            const consoleEventsSlice = consoleEvents.slice(i * 2, i * 2 + 2);

            const mainMessageData = consoleEventsSlice[0];
            const additionalMessageData = consoleEventsSlice[1];

            expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMsg);
            expect(additionalMessageData.args.length, 'additional message should be logged as 2 parts').toBe(2);

            const additionalMessageArgs = await Promise.all([
                additionalMessageData.args[0].jsonValue(),
                additionalMessageData.args[1].jsonValue()
            ]);

            expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
            expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toEqual(expectedAdditionalMessageParts[1]);
        }
    });

    test('logInfo() prints "hello world" using "info" log level, "additional" "{ foo: 123 }" as string using "params" "{ stringifyAdditional: true }"', async ({ page }) => {
        const expectedMainMsg = '[info] hello world';
        const expectedAdditionalMessageParts = ['[info] additional data:\n', JSON.stringify({ foo: 123 }, null, 2)];

        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let { logInfo } = new window.Logger();
            logInfo('hello world', { 
                additional: { foo: 123 },
                stringifyAdditional: true 
            });
            logInfo('hello world', { foo: 123 }, { stringifyAdditional: true });
        }, consoleListeningDurationMs);
        const consoleEvents = await consoleEventsPromise;
        expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(4);

        for (let i = 0; i < 2; i++) {
            const consoleEventsSlice = consoleEvents.slice(i * 2, i * 2 + 2);

            const mainMessageData = consoleEventsSlice[0];
            const additionalMessageData = consoleEventsSlice[1];

            expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMsg);
            expect(additionalMessageData.args.length, 'additional message should be logged as 2 parts').toBe(2);

            const additionalMessageArgs = await Promise.all([
                additionalMessageData.args[0].jsonValue(),
                additionalMessageData.args[1].jsonValue()
            ]);

            expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
            expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toEqual(expectedAdditionalMessageParts[1]);
        }
    });

    test('logWarn() prints "hello world" using "warn" log level, "additional" "{ foo: 123 }" as string using "params" "{ stringifyAdditional: true }"', async ({ page }) => {
        const expectedMainMsg = '[warn] hello world';
        const expectedAdditionalMessageParts = ['[warn] additional data:\n', JSON.stringify({ foo: 123 }, null, 2)];

        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let { logWarn } = new window.Logger();
            logWarn('hello world', { 
                additional: { foo: 123 },
                stringifyAdditional: true 
            });
            logWarn('hello world', { foo: 123 }, { stringifyAdditional: true });
        }, consoleListeningDurationMs);
        const consoleEvents = await consoleEventsPromise;
        expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(4);

        for (let i = 0; i < 2; i++) {
            const consoleEventsSlice = consoleEvents.slice(i * 2, i * 2 + 2);

            const mainMessageData = consoleEventsSlice[0];
            const additionalMessageData = consoleEventsSlice[1];

            expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMsg);
            expect(additionalMessageData.args.length, 'additional message should be logged as 2 parts').toBe(2);

            const additionalMessageArgs = await Promise.all([
                additionalMessageData.args[0].jsonValue(),
                additionalMessageData.args[1].jsonValue()
            ]);

            expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
            expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toEqual(expectedAdditionalMessageParts[1]);
        }
    });

    test('logError() prints "hello world" using "error" log level', async ({ page }) => {
        const expectedMainMsg = '[error] hello world';
        const expectedAdditionalMessageParts = ['[error] additional data:\n', JSON.stringify({ foo: 123 }, null, 2)];

        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let { logError } = new window.Logger();
            logError('hello world', { 
                additional: { foo: 123 },
                stringifyAdditional: true 
            });
            logError('hello world', { foo: 123 }, { stringifyAdditional: true });
        }, consoleListeningDurationMs);
        const consoleEvents = await consoleEventsPromise;
        expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(4);

        for (let i = 0; i < 2; i++) {
            const consoleEventsSlice = consoleEvents.slice(i * 2, i * 2 + 2);

            const mainMessageData = consoleEventsSlice[0];
            const additionalMessageData = consoleEventsSlice[1];

            expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMsg);
            expect(additionalMessageData.args.length, 'additional message should be logged as 2 parts').toBe(2);

            const additionalMessageArgs = await Promise.all([
                additionalMessageData.args[0].jsonValue(),
                additionalMessageData.args[1].jsonValue()
            ]);

            expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
            expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toEqual(expectedAdditionalMessageParts[1]);
        }
    });
})

test.describe('passing additional data', () => {
    test('logging "main" message and "additinal" as empty object "{}", expecting "additional" to be object "{}"', async ({ page }) => {
        const expectedMainMsg = '[info] hello world';
        const expectedAdditionalMessageParts = ['[info] additional data:\n', {}];

        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', {
                additional: {}
            });
            logger.log('info', 'hello world', {}); // alias
        }, consoleListeningDurationMs);
        const consoleEvents = await consoleEventsPromise;
        expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(4);

        for (let i = 0; i < 2; i++) {
            const consoleEventsSlice = consoleEvents.slice(i * 2, i * 2 + 2);

            const mainMessageData = consoleEventsSlice[0];
            const additionalMessageData = consoleEventsSlice[1];

            expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMsg);
            expect(additionalMessageData.args.length, 'additional message should be logged as 2 parts').toBe(2);

            const additionalMessageArgs = await Promise.all([
                additionalMessageData.args[0].jsonValue(),
                additionalMessageData.args[1].jsonValue()
            ]);

            expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
            expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toEqual(expectedAdditionalMessageParts[1]);
        }
    });

    test('logging "main" message and "additinal" as string, when "additional" is string "foo and bar"', async ({ page }) => {
        const expectedMainMsg = '[info] hello world';
        const expectedAdditionalMessageParts = ['[info] additional data:\n', 'foo and bar'];

        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', {
                additional: 'foo and bar'
            });
            logger.log('info', 'hello world', 'foo and bar');
            logger.log('info', 'hello world', 'foo and bar', {});
        }, consoleListeningDurationMs);
        const consoleEvents = await consoleEventsPromise;
        expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(6);

        for (let i = 0; i < 2; i++) {
            const consoleEventsSlice = consoleEvents.slice(i * 2, i * 2 + 2);

            const mainMessageData = consoleEventsSlice[0];
            const additionalMessageData = consoleEventsSlice[1];

            expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMsg);
            expect(additionalMessageData.args.length, 'additional message should be logged as 2 parts').toBe(2);

            const additionalMessageArgs = await Promise.all([
                additionalMessageData.args[0].jsonValue(),
                additionalMessageData.args[1].jsonValue()
            ]);

            expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
            expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toEqual(expectedAdditionalMessageParts[1]);
        }
    });

    test('logging "main" message and "additinal" as object, when "additional" is object "{ foo: "and bar" }"', async ({ page }) => {
        const expectedMainMsg = '[info] hello world';
        const expectedAdditionalMessageParts = ['[info] additional data:\n', { foo: "and bar" }];

        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', {
                additional: { foo: "and bar" }
            });
            logger.log('info', 'hello world', { foo: "and bar" });
        }, consoleListeningDurationMs);
        const consoleEvents = await consoleEventsPromise;
        expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(4);

        for (let i = 0; i < 2; i++) {
            const consoleEventsSlice = consoleEvents.slice(i * 2, i * 2 + 2);

            const mainMessageData = consoleEventsSlice[0];
            const additionalMessageData = consoleEventsSlice[1];

            expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMsg);
            expect(additionalMessageData.args.length, 'additional message should be logged as 2 parts').toBe(2);

            const additionalMessageArgs = await Promise.all([
                additionalMessageData.args[0].jsonValue(),
                additionalMessageData.args[1].jsonValue()
            ]);

            expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
            expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toEqual(expectedAdditionalMessageParts[1]);
        }
    });

    test('logging only "main" message when "additional" is "undefined"', async ({ page }) => {
        const expectedMainMsg = '[info] hello world';

        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', {
                additional: undefined
            });
            logger.log('info', 'hello world', undefined);
        }, consoleListeningDurationMs);
        const consoleEvents = await consoleEventsPromise;
        expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(2);

        for (let i = 0; i < 2; i++) {
            const mainMessageData = consoleEvents[i];

            expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMsg);
        }
    });

    test('logging "main" message and "additinal" when: (1) "additional" is "undefined" & (2) "alwaysLogAdditional" is "true"', async ({ page }) => {
        const expectedMainMsg = '[info] hello world';
        const expectedAdditionalMessageParts = ['[info] additional data:\n', undefined];

        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', {
                additional: undefined,
                alwaysLogAdditional: true
            });
            logger.log('info', 'hello world', undefined, { alwaysLogAdditional: true });
        }, consoleListeningDurationMs);
        const consoleEvents = await consoleEventsPromise;
        expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(4);

        for (let i = 0; i < 2; i++) {
            const consoleEventsSlice = consoleEvents.slice(i * 2, i * 2 + 2);

            const mainMessageData = consoleEventsSlice[0];
            const additionalMessageData = consoleEventsSlice[1];

            expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMsg);
            expect(additionalMessageData.args.length, 'additional message should be logged as 2 parts').toBe(2);

            const additionalMessageArgs = await Promise.all([
                additionalMessageData.args[0].jsonValue(),
                additionalMessageData.args[1].jsonValue()
            ]);

            expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
            expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toEqual(expectedAdditionalMessageParts[1]);
        }
    });

    test.describe('stringify additional with "stringifyAdditional" = "true" option', () => {
        test('"additional" is object "{ hello: "world", foo: "bar" }"', async ({ page }) => {
            const expectedMainMsg = '[info] hello world';
            const expectedAdditionalMessageParts = ['[info] additional data:\n', JSON.stringify({ foo: "and bar" }, null, 2)];

            const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
                let logger = new window.Logger();
                logger.log('info', 'hello world', {
                    additional: { foo: "and bar" },
                    stringifyAdditional: true
                });
                logger.log('info', 'hello world', { foo: "and bar" }, { stringifyAdditional: true });
            }, consoleListeningDurationMs);
            const consoleEvents = await consoleEventsPromise;
            expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(4);

            for (let i = 0; i < 2; i++) {
                const consoleEventsSlice = consoleEvents.slice(i * 2, i * 2 + 2);

                const mainMessageData = consoleEventsSlice[0];
                const additionalMessageData = consoleEventsSlice[1];

                expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMsg);
                expect(additionalMessageData.args.length, 'additional message should be logged as 2 parts').toBe(2);

                const additionalMessageArgs = await Promise.all([
                    additionalMessageData.args[0].jsonValue(),
                    additionalMessageData.args[1].jsonValue()
                ]);

                expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
                expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toEqual(expectedAdditionalMessageParts[1]);
            }
        });

        test('"additional" is object "{ hello: "world", foo: "bar" }", replacer is an array ["hello"]', async ({ page }) => {
            const expectedMainMsg = '[info] hello world';
            const expectedAdditionalMessageParts = ['[info] additional data:\n', JSON.stringify({ hello: "world" }, null, 2)];

            const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
                let logger = new window.Logger();
                logger.log('info', 'hello world', {
                    additional: { hello: "world", foo: "bar" },
                    stringifyAdditional: {
                        replacer: ['hello']
                    }
                });
                logger.log('info', 'hello world', { hello: "world", foo: "bar" }, {
                    stringifyAdditional: {
                        replacer: ['hello']
                    }
                });
            }, consoleListeningDurationMs);
            const consoleEvents = await consoleEventsPromise;
            expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(4);

            for (let i = 0; i < 2; i++) {
                const consoleEventsSlice = consoleEvents.slice(i * 2, i * 2 + 2);

                const mainMessageData = consoleEventsSlice[0];
                const additionalMessageData = consoleEventsSlice[1];

                expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMsg);
                expect(additionalMessageData.args.length, 'additional message should be logged as 2 parts').toBe(2);

                const additionalMessageArgs = await Promise.all([
                    additionalMessageData.args[0].jsonValue(),
                    additionalMessageData.args[1].jsonValue()
                ]);

                expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
                expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toEqual(expectedAdditionalMessageParts[1]);
            }
        });

        test('"additional" is object "{ hello: "world", foo: "bar" }", replacer is a function that replaces "hello" property value with "bar"', async ({ page }) => {
            const expectedMainMsg = '[info] hello world';
            const expectedAdditionalMessageParts = ['[info] additional data:\n', JSON.stringify({ hello: "bar", foo: 'bar' }, null, 2)];

            const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
                let logger = new window.Logger();
                logger.log('info', 'hello world', {
                    additional: { hello: "world", foo: "bar" },
                    stringifyAdditional: {
                        replacer: (key, value) => key === 'hello' ? 'bar' : value
                    }
                });
                logger.log('info', 'hello world', { hello: "world", foo: "bar" }, {
                    stringifyAdditional: {
                        replacer: (key, value) => key === 'hello' ? 'bar' : value
                    }
                });
            }, consoleListeningDurationMs);
            const consoleEvents = await consoleEventsPromise;
            expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(4);

            for (let i = 0; i < 2; i++) {
                const consoleEventsSlice = consoleEvents.slice(i * 2, i * 2 + 2);

                const mainMessageData = consoleEventsSlice[0];
                const additionalMessageData = consoleEventsSlice[1];

                expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMsg);
                expect(additionalMessageData.args.length, 'additional message should be logged as 2 parts').toBe(2);

                const additionalMessageArgs = await Promise.all([
                    additionalMessageData.args[0].jsonValue(),
                    additionalMessageData.args[1].jsonValue()
                ]);

                expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
                expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toEqual(expectedAdditionalMessageParts[1]);
            }
        });

        test('"additional" is object "{ hello: "world", foo: "bar" }", "space" is set to 4', async ({ page }) => {
            const expectedMainMsg = '[info] hello world';
            const expectedAdditionalMessageParts = ['[info] additional data:\n', JSON.stringify({ hello: "world", foo: 'bar' }, null, 4)];

            const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
                let logger = new window.Logger();
                logger.log('info', 'hello world', {
                    additional: { hello: "world", foo: "bar" },
                    stringifyAdditional: {
                        space: 4
                    }
                });
                logger.log('info', 'hello world', { hello: "world", foo: "bar" }, {
                    stringifyAdditional: {
                        space: 4
                    }
                });
            }, consoleListeningDurationMs);
            const consoleEvents = await consoleEventsPromise;
            expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(4);

            for (let i = 0; i < 2; i++) {
                const consoleEventsSlice = consoleEvents.slice(i * 2, i * 2 + 2);

                const mainMessageData = consoleEventsSlice[0];
                const additionalMessageData = consoleEventsSlice[1];

                expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMsg);
                expect(additionalMessageData.args.length, 'additional message should be logged as 2 parts').toBe(2);

                const additionalMessageArgs = await Promise.all([
                    additionalMessageData.args[0].jsonValue(),
                    additionalMessageData.args[1].jsonValue()
                ]);

                expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
                expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toEqual(expectedAdditionalMessageParts[1]);
            }
        });
    });
});

test.describe('extra tests for: additional data as regular [3rd] arg getting along with props [3rd or 4th] arg', () => {
    test('logging "main" message and "props" "{ additional: 123 }" @ 3rd arg, expecting it to be "props" and "additional" to be number "123"', async ({ page }) => {
        /**
         * A litte description of what is happening here:
         * Only a 3rd argument is provided, and it is an object and has property named "additional", 
         * which matches the criteria for this object to be either "params" or "additional"
         * - if it is "params" → only number "123" will be printed
         * - if it is "additional" — the whole object "{ additional: 123 }" will be printed, not just a single number
         * 
         * so because there is not foreign properties (properties that "props" cannot have), the object is assumed to be "props"
         */
        const expectedMainMsg = '[info] hello world';
        const expectedAdditionalMessageParts = ['[info] additional data:\n', 123];

        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', { additional: 123 });
        }, consoleListeningDurationMs);
        const consoleEvents = await consoleEventsPromise;
        expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(2);

        const mainMessageData = consoleEvents[0];
        const additionalMessageData = consoleEvents[1];

        expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMsg);
        expect(additionalMessageData.args.length, 'additional message should be logged as 2 parts').toBe(2);

        const additionalMessageArgs = await Promise.all([
            additionalMessageData.args[0].jsonValue(),
            additionalMessageData.args[1].jsonValue()
        ]);

        expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
        expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toBe(expectedAdditionalMessageParts[1]);
    });

    test('logging "main" message and "props" "{ additional: 123, hello: \'world\' }" @ 3rd arg, expecting that object to be "additional"', async ({ page }) => {
        const expectedMainMsg = '[info] hello world';
        const expectedAdditionalMessageParts = ['[info] additional data:\n', { additional: 123, hello: 'world' }];

        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', { additional: 123, hello: 'world' });
        }, consoleListeningDurationMs);
        const consoleEvents = await consoleEventsPromise;
        expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(2);

        const mainMessageData = consoleEvents[0];
        const additionalMessageData = consoleEvents[1];

        expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMsg);
        expect(additionalMessageData.args.length, 'additional message should be logged as 2 parts').toBe(2);

        const additionalMessageArgs = await Promise.all([
            additionalMessageData.args[0].jsonValue(),
            additionalMessageData.args[1].jsonValue()
        ]);

        expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
        expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toEqual(expectedAdditionalMessageParts[1]);
    });
});

test.describe('throwing errors', () => {
    test('no error is thrown when "throwErr" is "undefined" or "false"; "main" message "hello world" and "additional" message "foo and bar" are logging', async ({ page }) => {
        const expectedMainMsg = '[info] hello world';
        const expectedAdditionalMessageParts = ['[info] additional data:\n', 'foo and bar'];

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

            logger.log('info', 'hello world', 'foo and bar', {
                throwErr: false
            });
            logger.log('info', 'hello world', 'foo and bar', {
                throwErr: undefined
            });
        }, consoleListeningDurationMs);
        const consoleEvents = await consoleEventsPromise;
        expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(8);

        for (let i = 0; i < 4; i++) {
            const consoleEventsSlice = consoleEvents.slice(i * 2, i * 2 + 2);

            const mainMessageData = consoleEventsSlice[0];
            const additionalMessageData = consoleEventsSlice[1];

            expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMsg);
            expect(additionalMessageData.args.length, 'additional message should be logged as 2 parts').toBe(2);

            const additionalMessageArgs = await Promise.all([
                additionalMessageData.args[0].jsonValue(),
                additionalMessageData.args[1].jsonValue()
            ]);

            expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
            expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toEqual(expectedAdditionalMessageParts[1]);
        }
    });

    test.describe('error is thrown when "throwErr" is true with text of "main" message; "main" message by itself is not logging', () => {
        test('passing "additional" data in "params"', async ({ page }) => {
            const expectedErrorMessage = '[error] hello world';

            const { consoleEventsPromise, pageFnRunnerPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
                let logger = new window.Logger();

                logger.log('error', 'hello world', {
                    additional: undefined,
                    throwErr: true
                });
            }, consoleListeningDurationMs);
            await (expect(pageFnRunnerPromise, 'error message should include the expected message')).rejects.toThrow(expectedErrorMessage);

            const consoleEvents = await consoleEventsPromise;
            expect(consoleEvents.length).toBe(0);
        });

        test('passing "additional" data as regular argument', async ({ page }) => {
            const expectedErrorMessage = '[error] hello world';

            const { consoleEventsPromise, pageFnRunnerPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
                let logger = new window.Logger();

                logger.log('error', 'hello world', undefined, {
                    throwErr: true
                });
            }, consoleListeningDurationMs);
            await (expect(pageFnRunnerPromise, 'error message should include the expected message')).rejects.toThrow(expectedErrorMessage);

            const consoleEvents = await consoleEventsPromise;
            expect(consoleEvents.length).toBe(0);
        });
    });

    test.describe('error is thrown when "throwErr" is true with text of "main" message; "main" message is not logging, but "additional" is', () => {
        test('passing "additional" data in "params"', async ({ page }) => {
            const expectedErrorMessage = '[error] hello world';
            const expectedAdditionalMessageParts = ['[error] additional data:\n', 'foo and bar'];

            const { consoleEventsPromise, pageFnRunnerPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
                let logger = new window.Logger();

                logger.log('error', 'hello world', {
                    additional: 'foo and bar',
                    throwErr: true
                });
            }, consoleListeningDurationMs);
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

        test('passing "additional" data as regular argument', async ({ page }) => {
            const expectedErrorMessage = '[error] hello world';
            const expectedAdditionalMessageParts = ['[error] additional data:\n', 'foo and bar'];

            const { consoleEventsPromise, pageFnRunnerPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
                let logger = new window.Logger();

                logger.log('error', 'hello world', 'foo and bar', {
                    throwErr: true
                });
            }, consoleListeningDurationMs);
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
    });

    test.describe('error is thrown when "throwErr" is of type "Error" — that "Error" itself will be thrown — after "main" message and "additional"', () => {
        test('passing "additional" data in "params"', async ({ page }) => {
            const expectedMainMessage = '[error] hello world';
            const expectedAdditionalMessageParts = ['[error] additional data:\n', 'foo and bar'];
            const expectedErrorMessage = '[error] this is an error'

            const { consoleEventsPromise, pageFnRunnerPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
                let logger = new window.Logger();

                logger.log('error', 'hello world', {
                    additional: 'foo and bar',
                    throwErr: new Error('this is an error')
                });
            }, consoleListeningDurationMs);
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

        test('passing "additional" data as regular argument', async ({ page }) => {
            const expectedMainMessage = '[error] hello world';
            const expectedAdditionalMessageParts = ['[error] additional data:\n', 'foo and bar'];
            const expectedErrorMessage = '[error] this is an error'

            const { consoleEventsPromise, pageFnRunnerPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
                let logger = new window.Logger();

                logger.log('error', 'hello world', 'foo and bar', {
                    throwErr: new Error('this is an error')
                });
            }, consoleListeningDurationMs);
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

    test.describe('error is thrown when "throwErr" is a string with text of that string — after "main" message and "additional"', () => {
        test('passing "additional" data in "params"', async ({ page }) => {
            const expectedMainMessage = '[error] hello world';
            const expectedAdditionalMessageParts = ['[error] additional data:\n', 'foo and bar'];
            const expectedErrorMessage = '[error] this is an error'

            const { consoleEventsPromise, pageFnRunnerPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
                let logger = new window.Logger();

                logger.log('error', 'hello world', {
                    additional: 'foo and bar',
                    throwErr: 'this is an error'
                });
            }, consoleListeningDurationMs);
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

        test('passing "additional" data as regular argument', async ({ page }) => {
            const expectedMainMessage = '[error] hello world';
            const expectedAdditionalMessageParts = ['[error] additional data:\n', 'foo and bar'];
            const expectedErrorMessage = '[error] this is an error'

            const { consoleEventsPromise, pageFnRunnerPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
                let logger = new window.Logger();

                logger.log('error', 'hello world', 'foo and bar', {
                    throwErr: 'this is an error'
                });
            }, consoleListeningDurationMs);
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
});

test.describe('cloning', () => {
    test('just cloning an instance with multiple prefixes', async ({ page }) => {
        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger('root', 'foo')
                .clone();
            logger.log('info', 'hello world');
        }, consoleListeningDurationMs);
        const consoleEvents = await consoleEventsPromise;

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe('[info | root > foo] hello world');
    });

    test('cloning and appending a prefix', async ({ page }) => {
        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger('root')
                .cloneAndAppendPrefix('foo');
            logger.log('info', 'hello world');
        }, consoleListeningDurationMs);
        const consoleEvents = await consoleEventsPromise;

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe('[info | root > foo] hello world');
    });

    test('cloning and appending multiple prefixes', async ({ page }) => {
        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger('root')
                .cloneAndAppendPrefix('foo', 'bar');
            logger.log('info', 'hello world');
        }, consoleListeningDurationMs);
        const consoleEvents = await consoleEventsPromise;

        expect(consoleEvents.length).toBe(1);
        expect(consoleEvents[0].msg).toBe('[info | root > foo > bar] hello world');
    });
});

test.describe('alerts', () => {
    test('alert "hello world" messsage when `alertMsg` is true, also logging it to console; also checking with "undefined" additional as regular arg', async ({ page }) => {
        const expectedMainMessage = '[info] hello world';
        const expectedAlertMessage = expectedMainMessage;

        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', {
                alertMsg: true
            });
            logger.log('info', 'hello world', undefined, {
                alertMsg: true
            });
        }, consoleListeningDurationMs);
        page.on('dialog', async (dialog) => {
            const type = dialog.type();
            const msg = dialog.message();

            expect(type).toBe('alert');
            expect(msg).toBe(expectedAlertMessage);

            await dialog.accept();
        });
        const consoleEvents = await consoleEventsPromise;
        expect(consoleEvents.length).toBe(2);

        for (let i = 0; i < 2; i++) {
            const mainMessageData = consoleEvents[i];

            expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMessage);
        }
    });

    test('alert "hello world" messsage and a little note saying there is additional data in console, when `alertMsg` is true, also logging it and additional string "some additional data" to console', async ({ page }) => {
        const expectedMainMessage = '[info] hello world';
        const expectedAdditionalMessageParts = ['[info] additional data:\n', 'some additional data'];
        const expectedAlertMessage = '[info] hello world'
            + '\n\n(see additional data in the console)';

        const { consoleEventsPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
            let logger = new window.Logger();
            logger.log('info', 'hello world', {
                additional: 'some additional data',
                alertMsg: true
            });
            logger.log('info', 'hello world', 'some additional data', {
                alertMsg: true
            });
        }, consoleListeningDurationMs);
        page.on('dialog', async (dialog) => {
            const type = dialog.type();
            const msg = dialog.message();

            expect(type).toBe('alert');
            expect(msg).toBe(expectedAlertMessage);

            await dialog.accept();
        });
        const consoleEvents = await consoleEventsPromise;
        expect(consoleEvents.length, 'should log main and additional messages as separate logs').toBe(4);

        for (let i = 0; i < 2; i++) {
            const consoleEventsSlice = consoleEvents.slice(i * 2, i * 2 + 2);

            const mainMessageData = consoleEventsSlice[0];
            const additionalMessageData = consoleEventsSlice[1];

            expect(mainMessageData.msg, 'unexpected main message').toBe(expectedMainMessage);
            expect(additionalMessageData.args.length, 'additional message should be logged as 2 parts').toBe(2);

            const additionalMessageArgs = await Promise.all([
                additionalMessageData.args[0].jsonValue(),
                additionalMessageData.args[1].jsonValue()
            ]);

            expect(additionalMessageArgs[0], 'first part of additional should be a note message').toBe(expectedAdditionalMessageParts[0]);
            expect(additionalMessageArgs[1], 'second part of additional should be additional itself').toEqual(expectedAdditionalMessageParts[1]);
        }
    });

    test.describe('alert "hello world" messsage and a little note saying there is additional data + an error in console, when `alertMsg` is true, also logging it and additional string "some additional data" to console, then throwing an error', () => {
        test('passing "additional" data in "params"', async ({ page }) => {
            const expectedMainMessage = '[info] hello world';
            const expectedAdditionalMessageParts = ['[info] additional data:\n', 'some additional data'];
            const expectedErrorMessage = 'this is an error 🤓🤓';
            const expectedAlertMessage = '[info] hello world'
                + '\n\n(see additional data in the console)'
                + '\n(see an error messaage in the console)';

            const { consoleEventsPromise, pageFnRunnerPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
                let logger = new window.Logger();
                logger.log('info', 'hello world', {
                    additional: 'some additional data',
                    throwErr: 'this is an error 🤓🤓',
                    alertMsg: true
                });
            }, consoleListeningDurationMs);
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

        test('passing "additional" data as regular argument', async ({ page }) => {
            const expectedMainMessage = '[info] hello world';
            const expectedAdditionalMessageParts = ['[info] additional data:\n', 'some additional data'];
            const expectedErrorMessage = 'this is an error 🤓🤓';
            const expectedAlertMessage = '[info] hello world'
                + '\n\n(see additional data in the console)'
                + '\n(see an error messaage in the console)';

            const { consoleEventsPromise, pageFnRunnerPromise } = await runFnAndGatherConsoleEventsForDuration(page, () => {
                let logger = new window.Logger();
                logger.log('info', 'hello world', 'some additional data', {
                    throwErr: 'this is an error 🤓🤓',
                    alertMsg: true
                });
            }, consoleListeningDurationMs);
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
});



/**
 * Console event data (`console.log()` and such). 
 */
type ConsoleEventData = {
    msg: string,
    args: JSHandle[],
    type: string
}

/**
 * Runs function `fn` within the `page` and then gathers all console messages for `duration` ms, returning them after.
 * 
 * @param page the page context.
 * @param fn a sync/async function to expose and then run within the page.
 * 
 * **NOTE:** this function is run within the `page` so it can't access this script or any context outside of the it, except for the data you pass in `args`.
 * @param duration for how long in ms to gather the console events.
 * @returns a promise that results in object with:
 * - `consoleEventsPromise` → a promise which resolves to an array of console event data records (messages basically) after the `duration` ms.
 * - `pageFnRunnerPromise` → a promise which resolves when function `fn` is done running to whatever you desided to return in it.
 */
async function runFnAndGatherConsoleEventsForDuration<R extends any, A extends Record<string, any>>(
    page: Page,
    fn: (arg: A) => R | Promise<R>,
    duration: number,
    {
        messagesToOnlyLookFor,
        messagesToIgnore = [],
        args,
    }: Partial<{
        /** whitelist for a specific console messages (if message is not this it will be ignored). 
         * no messages are whitelisted by default. can be overriden by `messagesToIgnore`
         */
        messagesToOnlyLookFor: string[],
        /** blacklist for a specific console messages (if message is any of this it will be ignored).
         * if message is whitelisted in `messagesToOnlyLookFor`, but blacklisted here — it will be ignored.
         */
        messagesToIgnore: string[],
        /** additional data to pass to {@link fn} as an argument — it should be serializable (so no functions, etc.) — use `page.exposeFunction` for this. */
        args: A
    }> = {}): Promise<{ consoleEventsPromise: Promise<ConsoleEventData[]>, pageFnRunnerPromise: Promise<R> }> {
    const consoleEventsPromise = gatherConsoleEventsForDuration(page, duration, {
        messagesToOnlyLookFor,
        messagesToIgnore
    });
    // @ts-ignore i dont understand you typescript
    const pageFnRunnerPromise = page.evaluate(fn, args);

    return { consoleEventsPromise, pageFnRunnerPromise };
}

/**
 * Gathers all console messages within the `page` for `duration` ms, returning them after.
 * 
 * @param page the page context.
 * @param duration for how long in ms to gather the console events.
 * @returns a promise which resolves to an array of console event data records (messages basically) after the `duration` ms.
 */
async function gatherConsoleEventsForDuration(page: Page, duration: number, {
    messagesToOnlyLookFor = [],
    messagesToIgnore = [],
}: Partial<{
    /** whitelist for a specific console messages (if message is not this it will be ignored). 
     * no messages are whitelisted by default. can be overriden by `messagesToIgnore`
     */
    messagesToOnlyLookFor: string[],
    /** blacklist for a specific console messages (if message is any of this it will be ignored).
     * if message is whitelisted in `messagesToOnlyLookFor`, but blacklisted here — it will be ignored.
     */
    messagesToIgnore: string[]
}> = {}): Promise<ConsoleEventData[]> {
    const isWhitelistActive = messagesToOnlyLookFor.length > 0;
    const consoleEventDataRecords: ConsoleEventData[] = [];

    const consoleEventListener = async (e: ConsoleMessage): Promise<void> => {
        const msg = e.text();
        const type = e.type();
        const args = e.args();

        if (isWhitelistActive) {
            const isWhitelisted = messagesToOnlyLookFor.includes(msg);
            if (!isWhitelisted)
                return;
        }

        const isBlacklisted = consoleMessagesToIgnore.includes(msg) || messagesToIgnore.includes(msg);
        if (isBlacklisted)
            return;

        consoleEventDataRecords.push({ msg, type, args });
    }
    page.addListener('console', consoleEventListener);

    await wait(duration)
    // .catch(err => { throw new Error('got an error: ' + err)});
    page.removeListener('console', consoleEventListener);

    return consoleEventDataRecords;
}

/**
 * Creates handles for collection of test coverage.
 */
function getCoverageGatherer() {
    const cwd = process.cwd();
    const coverageMap = libCoverage.createCoverageMap();

    return {
        /** Starts gathering coverage. */
        async startGatheringCoverage(page: Page) {
            await page.coverage.startJSCoverage();
        },
        /** Stops gathering coverage. */
        async finishGatheringCoverage(page: Page) {
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
        /** Generates coverage report from gathered data and writes it to disk. */
        async generateAndSaveCoverageReport() {
            const uniqueDirSuffix = randomString({ length: 8, type: 'distinguishable' });

            const context = libReport.createContext({ coverageMap, dir: path.join('./coverage/e2e', `report-chunk-${uniqueDirSuffix}`) });
            reports.create(process.env.CI ? 'lcov' : 'lcov').execute(context);
        }
    }
}

/**
 * Returns a promise which will be resolved after `ms`.
 * 
 * @param ms waiting duration.
 */
async function wait(ms: number) {
    await new Promise(resolve => setTimeout(resolve, ms));
}

async function exposeDebugFunctionToPage(page: Page, useActualLogFunction: boolean) {
    if (useActualLogFunction) {
        // this exposes the actual log function to node context, so it can be called
        // from `log_debug` — this is possible because `page.exposeFunction` just allows to call
        // functions in this (node) context as-is, which requires to augment this context, not the page context.
        globalThis['DEBUG_logActual'] = (str: string) => console.log('[debug] ' + str)
    } else {
        // expose `log_debug` function in page context which does nothing by default
        // this is done before each test so that the actual code wont fail calling `log_debug`
        await page.exposeFunction('DEBUG_log', (str: string) => {
            if (globalThis['DEBUG_logActual'])
                DEBUG_logActual(str);
        });
    }
}