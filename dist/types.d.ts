/**
 * Additional-optional parameters used when logging.
 */
export type LogParams = {
    /**
     * Additional data to log after "main" message. Can be of any type, including `null` or `undefined` (see below for more info).
     *
     * By default, given value is logged «as is» (so you can view it in your browser console),
     * but can be stringified by setting {@link LogParams.stringifyAdditional stringifyAdditional} option to `true`
     * (see its docs for more info).
     *
     * If you value happens to be `undefined`, it will not be logged unless {@link LogParams.alwaysLogAdditional alwaysLogAdditional} option is `true`
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
    additional: unknown;
    /**
     * Log additional data (see {@link LogParams.additional additional}) in case it is `undefined`?
     *
     * @default false
     */
    alwaysLogAdditional: true;
    /**
     * If `true`, stringifies given {@link LogParams.additional additional} using {@link JSON.stringify}
     * (see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify JSON docs on MDN}).
     *
     * You can pass an object to configure more settings.
     *
     * @throws `TypeError` if {@link LogParams.additional additional} is {@link BigInt} or an object that contains circlular references.
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
     * the little notes telling you about whether there is {@link LogParams.additional additional data} or {@link LogParams.throwErr an error} being thrown.
     *
     * "main" message and {@link LogParams.additional additional} are logged before showing the modal, but in case of {@link LogParams.throwErr an error} — it will be thrown after.
     *
     * **Note:** works only in browser!
     *
     * @default false
     */
    alertMsg: true;
};
export type LogParamsWithoutAdditional = Omit<LogParams, 'additional'>;
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
export type LogAliasFn = {
    /**
     * Logs {@link msg} using log level defined by the alias function.
     *
     * **NOTE:** this overload might be unintentional — check if you passing `params` as 2nd argument {@link params} and **not** `additional` data.
     * More details in other overload.
     *
     * @param msg a message to log.
     * @param params optional parameters.
     */
    (msg: unknown, params?: Partial<LogParams>): void;
    /**
     * Logs {@link msg} and additional data {@link additional} using log level defined by the alias function.
     * Can optionally have {@link params} without `additional` in it.
     *
     * **NOTE:** {@link additional} can be interpreted as `params` in case it is matches all these conditions:
     * 1. It is an object and is not empty.
     * 2. It **only** containts properties with {@link LogParams names that `params` can have}.
     * 3. {@link params} is not provided.
     * If you want to be safe and log {@link additional} no matter what — provide it as `additional` property in `params` using other overload.
     *
     * @param msg a message to log.
     * @param additional additional data to log.
     * @param params optional parameters.
     */
    (msg: unknown, additional: LogParams['additional'], params?: Partial<LogParamsWithoutAdditional>): void;
};
export type LogFn = {
    /**
     * Logs {@link msg} using {@link level} log level.
     *
     * **NOTE:** this overload might be unintentional — check if you passing `params` as 3rd argument {@link params} and **not** `additional` data.
     * More details in other overload.
     *
     * @param level log level.
     * @param msg a message to log.
     * @param params optional parameters.
     */
    (level: LogLevel, msg: unknown, params?: Partial<LogParams>): void;
    /**
     * Logs {@link msg} and additional data {@link additional} using {@link level} log level.
     * Can optionally have {@link params} without `additional` in it.
     *
     * **NOTE:** {@link additional} can be interpreted as `params` in case it is matches all these conditions:
     * 1. It is an object and is not empty.
     * 2. It **only** containts properties with {@link LogParams names that `params` can have}.
     * 3. {@link params} is not provided.
     * If you want to be safe and log {@link additional} no matter what — provide it as `additional` property in `params` using other overload.
     *
     * @param level log level.
     * @param msg a message to log.
     * @param additional additional data to log.
     * @param params optional parameters.
     */
    (level: LogLevel, msg: unknown, additional: LogParams['additional'], params?: Partial<LogParamsWithoutAdditional>): void;
};
