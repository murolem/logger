import { paramNames } from '$src/contants';
import { objectGetOwnOrFallback } from '$utils/objectGetOwnOrFallback';
import { objectHasOwnOnly } from '$utils/objectHasOwnOnly';

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
	additional: unknown,

	/**
	 * Log additional data (see {@link MessageLogParams.additional additional}) in case it is `undefined`?
	 * 
	 * @default false
	 */
	alwaysLogAdditional: true,

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
		replacer: ((this: any, key: string, value: any) => any) | (number | string)[] | null,
		/** 
		 * Adds indentation, white space, and line break characters to the 
		 * return-value JSON text to make it easier to read. 
		 * 
		 * See {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#parameters JSON docs on MDN} for more info. 
		 * 
		 * @default undefined
		 */
		space: string | number
	}>,

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
	throwErr: boolean | Error | string,

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
	alertMsg: true
}

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
	/**
	 * An array of strings composing the prefix.
	 */
	#prefixParts: string[] = [];
	/**
	 * A prefix ready-to-be-used. Upadtes when prefix changes. 
	 */
	#prefixBody: string | undefined;

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
	constructor(...prefix: string[]) {
		this.appendPrefix(...prefix);
	}

	/**
	 * Append a new prefix to current ones.
	 * 
	 * @param prefix prefix or multiple prefixes.
	 * @returns this.
	 */
	appendPrefix = (...prefix: string[]): Logger => {
		this.#prefixParts.push(...prefix);
		this.#prefixBody = this.#prefixParts.join(' > ');

		return this;
	}

	/**
	 * Creates a copy of this class (prefixes are kept!).
	 * 
	 * @returns a new {@link Logger} instance.
	 */
	clone = (): Logger => {
		return new Logger(...this.#prefixParts);
	}

	/**
	 * Creates a copy of this class (prefixes are kept!) and appends to it a new prefix or multiple prefixes.
	 * 
	 * @param prefix prefix or multiple prefixes.
	 * @returns a new {@link Logger} instance.
	 */
	cloneAndAppendPrefix = (...prefix: string[]): Logger => {
		return this.clone().appendPrefix(...prefix);
	}

	/**
	 * Logs {@link msg} using `debug` log level and optional `params`.
	 * 
	 * @param msg a message to log.
	 * @param params optional params.
	 */
	logDebug = (msg: unknown, params?: Partial<MessageLogParams>): void => {
		this.log('debug', msg, params);
	}

	/**
	 * Logs {@link msg} using `info` log level and optional `params`.
	 * 
	 * @param msg a message to log.
	 * @param params optional params.
	 */
	logInfo = (msg: unknown, params?: Partial<MessageLogParams>): void => {
		this.log('info', msg, params);
	}

	/**
	 * Logs {@link msg} using `warn` log level and optional `params`.
	 * 
	 * @param msg a message to log.
	 * @param params optional params.
	 */
	logWarn = (msg: unknown, params?: Partial<MessageLogParams>): void => {
		this.log('warn', msg, params);
	}

	/**
	 * Logs {@link msg} using `error` log level and optional `params`.
	 * 
	 * @param msg a message to log.
	 * @param params optional params.
	 */
	logError = (msg: unknown, params?: Partial<MessageLogParams>): void => {
		this.log('error', msg, params);
	}


	log: {
		/**
		 * Logs {@link msg} using {@link level} log level.
		 * 
		 * @param level log level.
		 * @param msg a message to log.
		 */
		(
			level: LogLevel,
			msg: unknown,
			params?: Partial<MessageLogParams>
		): void,
		/**
		 * Logs {@link msg} and additional data {@link additional} using {@link level} log level.
		 * 
		 * @param level log level.
		 * @param msg a message to log.
		 */
		(
			level: LogLevel,
			msg: unknown,
			additional: MessageLogParams['additional'],
			params?: Partial<Omit<MessageLogParams, 'additional'>>
		): void,
	} = (
		level: LogLevel,
		msg: unknown,
		arg3?: Partial<MessageLogParams> | MessageLogParams['additional'],
		arg4?: Partial<Omit<MessageLogParams, 'additional'>>
	): void => {
			let { 
				additional,
				alwaysLogAdditional,
				stringifyAdditional,
				alertMsg,
				throwErr
			}: Partial<MessageLogParams> = {
				additional: undefined,
				alwaysLogAdditional: undefined,
				stringifyAdditional: undefined,
				alertMsg: undefined,
				throwErr: false,
			}

			
			if(arg3) {
				// 3rd arg is ambiguous, lets check if it is a params object or "additional" data
				// if its empty, assume it is additinal data, NOT params
				const isArg3IsParamsObj = objectHasOwnOnly(arg3, paramNames) && Object.keys(arg3).length > 0;
				if(isArg3IsParamsObj) {
					// 1st overload, arg3 is params object
					const params = arg3 as Partial<MessageLogParams>;

					additional = objectGetOwnOrFallback(params, 'additional', additional);
					alwaysLogAdditional = objectGetOwnOrFallback(params, 'alwaysLogAdditional', alwaysLogAdditional);
					stringifyAdditional = objectGetOwnOrFallback(params, 'stringifyAdditional', stringifyAdditional);
					alertMsg = objectGetOwnOrFallback(params, 'alertMsg', alertMsg);
					throwErr = objectGetOwnOrFallback(params, 'throwErr', throwErr);
				} else {
					// 2nd overload, arg3 is "additional" data, params object may be arg4
					additional = arg3;

					if(arg4) {
						// arg4 is params object
						const params = arg4 as Partial<MessageLogParams>;

						// no "additional" because it was assigned from arg3 
						alwaysLogAdditional = objectGetOwnOrFallback(params, 'alwaysLogAdditional', alwaysLogAdditional);
						stringifyAdditional = objectGetOwnOrFallback(params, 'stringifyAdditional', stringifyAdditional);
						alertMsg = objectGetOwnOrFallback(params, 'alertMsg', alertMsg);
						throwErr = objectGetOwnOrFallback(params, 'throwErr', throwErr);
					}
				}
			}

			const prefix = `[${level}${this.#prefixBody ? ` | ${this.#prefixBody}` : ''}] `;
			const msgWithPrefix = prefix + msg;
			const logMsg = throwErr !== true;

			if (logMsg)
				console.log(msgWithPrefix);

			const logAdditional = alwaysLogAdditional || additional !== undefined;
			if (logAdditional) {
				if (stringifyAdditional) {
					if (stringifyAdditional === true) // just boolean value
						console.log(prefix + 'additional data:\n', JSON.stringify(additional));
					else // an object
						console.log(prefix + 'additional data:\n', JSON.stringify(
							additional,
							// @ts-ignore fuck off
							stringifyAdditional.replacer,
							stringifyAdditional.space)
						);
				} else
					console.log(prefix + 'additional data:\n', additional);
			}

			if (alertMsg) {
				const parts = [
					msgWithPrefix// + '\n\n'
				];

				if (logAdditional)
					parts.push('(see additional data in the console)');
				if (throwErr)
					parts.push('(see an error messaage in the console)');

				let result;
				if (parts.length === 1)
					result = parts[0];
				else
					result = parts[0]
						+ '\n\n'
						+ parts.slice(1).join('\n')

				alert(result);
			}

			if (throwErr) {
				if (typeof throwErr === 'string') // throwing custom message
					throw new Error(prefix + throwErr);
				else if (throwErr instanceof Error) { // throwing the provided error
					throwErr.message = prefix + throwErr.message;
					throw throwErr;
				} else // boolean true -- loggin the message in error itself
					throw new Error(msgWithPrefix);
			}
		}
}