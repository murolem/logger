import { LogAliasFn, LogFn } from './types.ts';
/**
 * The logger utility.
 *
 * (see the constructor for more details).
 */
export default class Logger {
    #private;
    /**
     * The logger utility.
     *
     * @param prefix a prefix or multiple prefixes to use when logging, like this:
     * ```text
     * [<log level> | <prefix1> > <prefix2>] <message>
     * ```
     * e.g.
     * ```text
     * [info | root > body] hello world
     * ```
     *
     * If no prefixes are given, only the log level is present, like this:
     * ```text
     * [info] hello world
     * ```
     *
     * You can add new prefixes using {@link appendPrefix} or create a copy of this logger and add new prefixes — with {@link cloneAndAppendPrefix}.
     *
     * @default undefined
     */
    constructor(...prefix: string[]);
    /**
     * Append a new prefix to current ones.
     *
     * @param prefix prefix or multiple prefixes.
     * @returns this.
     */
    appendPrefix: (...prefix: string[]) => Logger;
    /**
     * Creates a copy of this class (prefixes are kept!).
     *
     * @returns a new {@link Logger} instance.
     */
    clone: () => Logger;
    /**
     * Creates a copy of this class (prefixes are kept!) and appends to it a new prefix or multiple prefixes.
     *
     * @param prefix prefix or multiple prefixes.
     * @returns a new {@link Logger} instance.
     */
    cloneAndAppendPrefix: (...prefix: string[]) => Logger;
    /**
     * Logs {@link msg} using `debug` log level.
     *
     * Call this function to see overloads and their details.
     */
    logDebug: LogAliasFn;
    /**
     * Logs {@link msg} using `info` log level.
     *
     * Call this function to see overloads and their details.
     */
    logInfo: LogAliasFn;
    /**
     * Logs {@link msg} using `warn` log level.
     *
     * Call this function to see overloads and their details.
     */
    logWarn: LogAliasFn;
    /**
     * Logs {@link msg} using `error` log level.
     *
     * Call this function to see overloads and their details.
     */
    logError: LogAliasFn;
    /**
     *Logs {@link msg} using {@link level} log level.
     *
     * Call this function to see overloads and their details.
     */
    log: LogFn;
}
