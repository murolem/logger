/**
 * Additional-optional parameters used when logging.
 */
export type MessageLogParams = {
    /**
     * Additional data to log after "main" message. Can be of any type, including `null` or `undefined` (see below for more info).
     *
     * By default, given value is logged «as is» (so you can view it in your browser console),
     * but can be stringified by setting {@link MessageLogParams.stringifyAdditional stringifyAdditional} option to `true`
     * (see its docs for more info).
     *
     * If you value happens to be `undefined`, it will not be logged unless {@link MessageLogParams.alwaysLogAdditional alwaysLogAdditional} option is `true`
     * (see its docs for more info).
     *
     * Data is logged in this format:
     * ```text
     * [<log level>] additional data:
     * 	<your data>
     * ```
     *
     * @default undefined
     */
    additional: any;
    /**
     * Log additional data (see {@link MessageLogParams.additional additional}) in case it is `undefined`?
     *
     * @default false
     */
    alwaysLogAdditional: true;
    /**
     * If `true`, stringifies given {@link MessageLogParams.additional additional} using {@link JSON.stringify}
     * (see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify JSON docs on MDN}).
     *
     * You can pass an object to configure more settings.
     *
     * @throws `TypeError` if {@link MessageLogParams.additional additional} is {@link BigInt} or an object that contains circlular references.
     *
     * @default false
     */
    stringifyAdditional: true | Partial<{
        /**
         * A function that transforms the results or an array of whitelisted object keys (as strings and numbers).
         *
         * See {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#parameters JSON docs on MDN} for more info.
         *
         * @default undefined
         */
        replacer: ((this: any, key: string, value: any) => any) | (number | string)[] | null;
        /**
         * Adds indentation, white space, and line break characters to the
         * return-value JSON text to make it easier to read.
         *
         * See {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#parameters JSON docs on MDN} for more info.
         *
         * @default undefined
         */
        space: string | number;
    }>;
    /**
     * Throws an error after logging is done.
     *
     * You can pass here value of any of these types:
     * - `boolean`:
     *    - `true` → will throw `Error` with "main" message, but the message itself will not be logged.
     *    - `false` → no error will be thrown.
     * - `Error` — will be thrown "as-is".
     * - `string` — will create a new `Error` with given text.
     *
     * **Note:** a good practice is to throw an error only on `error` log level — it just easier to read.
     *
     * @default false
     */
    throwErr: boolean | Error | string;
    /**
     * Do you want to show a modal window using `alert()`? Window will contain "main" message and
     * the little notes telling you about whether there is {@link MessageLogParams.additional additional data} or {@link MessageLogParams.throwErr an error} being thrown.
     *
     * "main" message and {@link MessageLogParams.additional additional} are logged before showing the modal, but in case of {@link MessageLogParams.throwErr an error} — it will be thrown after.
     *
     * **Note:** works only in browser!
     *
     * @default false
     */
    alertMsg: true;
};
/**
 * Levels of logging:
 * - `debug` — for anything that should be visible only in development, examples: `hello world`, `test debug debug test`.
 * - `info` — just for anything else that is not a warning/error or a debug message, examples: `module initilized`, `donuts baking in progress...`.
 * - `warn` — warning that user should know about, but nothing critical that can totally stop the program, examples: `something-something is deprecated`, `<feature> is not supported`.
 * - `error` — for anything bad, examples: `crash crash CRASH` or `oops, something went terribly wrong we're so sorry oopsie-daisy`.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
/**
 * Type for aliases of log levels, e.g. {@link Logger.logInfo}.
 */
export type LogAliasFn = (msg: string, params?: Partial<MessageLogParams>) => void;
/**
 * The logger utility (not an ultimate, very simple).
 *
 * (see constructor for more details).
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
     * Logs {@link msg} using `debug` log level and optional `params`.
     *
     * @param msg a message to log.
     * @param params optional params.
     */
    logDebug: (msg: string, params?: Partial<MessageLogParams>) => void;
    /**
     * Logs {@link msg} using `info` log level and optional `params`.
     *
     * @param msg a message to log.
     * @param params optional params.
     */
    logInfo: (msg: string, params?: Partial<MessageLogParams>) => void;
    /**
     * Logs {@link msg} using `warn` log level and optional `params`.
     *
     * @param msg a message to log.
     * @param params optional params.
     */
    logWarn: (msg: string, params?: Partial<MessageLogParams>) => void;
    /**
     * Logs {@link msg} using `error` log level and optional `params`.
     *
     * @param msg a message to log.
     * @param params optional params.
     */
    logError: (msg: string, params?: Partial<MessageLogParams>) => void;
    /**
     * Logs {@link msg} using {@link level} log level.
     *
     * @param level log level.
     * @param msg a message to log.
     */
    log: (level: LogLevel, msg: string, { additional, alwaysLogAdditional, stringifyAdditional, alertMsg, throwErr }?: Partial<MessageLogParams>) => void;
}
