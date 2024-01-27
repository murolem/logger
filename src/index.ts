import { paramNames } from '$constants';
// import { LogAliasFn, LogFn, LogLevel, LogParams, LogParamsStringifyAdditionalObj, LogParamsWithoutAdditional } from '$types';
import { isObject } from '$utils/isObject';
import { noop } from '$utils/noop';
import { objectGetOwnOrFallback } from '$utils/objectGetOwnOrFallback';
import { doesObjectOnlyHaveSpecificProps } from '$utils/doesObjectOnlyHaveSpecificProps';
import { fallbackIfNullish } from '$utils/fallbackIfNullish';
import { StringLiteralArrayItems } from '$types';

// todo:
// - возможность выбрать уровень логгирования - при выбранном уровне, будут логгироваться сообщения только такого уровеня и выше.
// - возможность создать уровень логгирования ошибок с выбросом исключения на месте (например соедениние уровеня error + "throw" = "logErrorAndThrow")
// - при выбросе ошибок обрабатывать error stack, чтобы не показывать stack trace point внутри логгера
// - возможность выбирать уровень логгирования (aka только ошибки).
// - таймстампы - формат YYYY-MM-DD HH:MM:SS. мб ms? 
// - функция "is additional" для проверки второго аргумента - является ли он "additional" или нет. мб будет полезно при перехвате вызовов к логгеру?
// - возможность перехватывать вызовы к логгеру через коллбек? "onLog", "onLogLevel"
// - цветастые сообщения? 
// - кастомный формат?
// - новый уровень логгирования - fatal, когда продолжить нельзя.
// - возможность назначать кастомный форматтер для additional?

/**
 * fsdfsdfsd
 */
type FormatOptions<LogLevel extends string> = {
	/**
	 * Log message format.
	 * 
	 * Default is `[timestamp logLevel delimiter prefix] message`.
	 * 
	 * All the parts except the `message` are optional.
	 * 
	 * Use other properties of this object to configure all the different parts of the format.
	 */
	pattern: string,

	/**
	 * A function providing timestamps.
	 * 
	 * Default function provides UTC timestamps of format `YYYY-MM-DD HH:MM:SS`.	
	 */
	timestamp(): string

	/**
	 * A function transforming the provided log level.
	 * 
	 * todo расписать что оно делает по умолчанию - скорее всего только раскраска?
	 * 
	 * 
	 * 
	 */
	logLevel(logLevel: LogLevel): string

	/**
	 * A delimiter that can be used to divide the parts of the log message.
	 * 
	 * Default is `|`.
	 */
	delimiter: string

	/**
	 * A function transforming the provided prefix.
	 * 
	 * todo расписать что оно делает по умолчанию - скорее всего только раскраска?
	 * todo расписать по-лучше
	 * 
	 * @param prefix a prefix, conjoined from all the prefix parts.
	 */
	prefix(prefix: string): string

	/**
	 * A delimiter between prefixes.
	 * 
	 * Default is `:`.
	 */
	prefixDelimiter: string

	/**
	 * A function transforming the message part of the whole log message.
	 * 
	 * Can be used, for example, to give it a color.
	 * 
	 * @param message a message part of the whole log message.
	 */
	message(message: string): string

	/**
	 * A function transforming the whole log message.
	 * 
	 * Can be used, for example, to give it a color.
	 * 
	 * @param message a whole log message.
	 */
	transform(message: string): string
}

type LogLevelOptions = {
	/**
	 * A name for the log level.
	 */
	name: string,

	/**
	 * Throw an error after logging a message with this level?
	 */
	throwAfterLogging: boolean
}

type Strictify<T> = { [K in keyof T]-?: T[K] & {} }

type Constructor<LogLevels extends readonly string[]> = Partial<{
	logLevels: LogLevels,

	/**
	 * Log message format.
	 * 
	 * **Using `string`:**
	 * 
	 * > Default is `[timestamp logLevel delimiter prefix] message`.
	 * 
	 * > All the parts except the `message` are optional.
	 * 
	 * **Using `FormatOptions`:**
	 * > Allows for more precise configuration.
	 * 
	 * > The format pattern is set in `pattern` property. Other properties are for configuring the parts of the message format.
	 */
	format: string | FormatOptions<LogLevels>
}>



/**
 * A logger utility.
 * 
 * (see the constructor for details).
 */
const Logger = function <LogLevels extends Readonly<string[]>>(
	this: {},
	{
		// @ts-ignore
		logLevels = ['debug', 'info', 'warn', 'error', 'fatal'] as const
	}: Constructor<LogLevels> = {}
): void {

	type ArrType = {
		[key in StringLiteralArrayItems<typeof arr>]: string
	}



	// /**
	//  * An array of strings composing the prefix.
	//  */
	// this.#prefixParts: string[] = [];

	// /**
	//  * Currrent prefix, conjoined from the provided parts. 
	//  */
	// #prefixBody: string | undefined;

	// /**
	//  * A logger utility.
	//  * 
	//  * @param prefix 
	//  * 
	//  * You can add new prefixes using {@link appendPrefix} or create a copy of this logger and add new prefixes — with {@link cloneAndAppendPrefix}.
	//  * 
	//  * @default undefined
	//  */
	// constructor({
	// 	format,
	// 	logLevels =['debug', 'info', 'warn', 'error', 'fatal']
	// }: Partial<Constructor>) {
	// 	this.appendPrefix(...prefix);

	// 	if (!globalThis['DEBUG_log'])
	// 		globalThis['DEBUG_log'] = noop;
	// }

	// /**
	//  * Append a new prefix to current ones.
	//  * 
	//  * @param prefix prefix or multiple prefixes.
	//  * @returns this.
	//  */
	// appendPrefix = (...prefix: string[]): Logger => {
	// 	this.#prefixParts.push(...prefix);
	// 	this.#prefixBody = this.#prefixParts.join(' > ');

	// 	return this;
	// }

	// /**
	//  * Creates a copy of this class (prefixes are kept!).
	//  * 
	//  * @returns a new {@link Logger} instance.
	//  */
	// clone = (): Logger => {
	// 	return new Logger(...this.#prefixParts);
	// }

	// /**
	//  * Creates a copy of this class (prefixes are kept!) and appends to it a new prefix or multiple prefixes.
	//  * 
	//  * @param prefix prefix or multiple prefixes.
	//  * @returns a new {@link Logger} instance.
	//  */
	// cloneAndAppendPrefix = (...prefix: string[]): Logger => {
	// 	return this.clone().appendPrefix(...prefix);
	// }

	// /**
	//  * Logs {@link msg} using `debug` log level.
	//  * 
	//  * Call this function to see overloads and their details.
	//  */
	// logDebug: LogAliasFn = (
	// 	msg: unknown,
	// 	arg2?: Partial<LogParams> | LogParams['additional'],
	// 	arg3?: Partial<LogParamsWithoutAdditional>
	// ): void => {
	// 	this.log('debug', msg, arg2, arg3);
	// }

	// /**
	//  * Logs {@link msg} using `info` log level.
	//  * 
	//  * Call this function to see overloads and their details.
	//  */
	// logInfo: LogAliasFn = (
	// 	msg: unknown,
	// 	arg2?: Partial<LogParams> | LogParams['additional'],
	// 	arg3?: Partial<LogParamsWithoutAdditional>
	// ): void => {
	// 	this.log('info', msg, arg2, arg3);
	// }

	// /**
	//  * Logs {@link msg} using `warn` log level.
	//  * 
	//  * Call this function to see overloads and their details.
	//  */
	// logWarn: LogAliasFn = (
	// 	msg: unknown,
	// 	arg2?: Partial<LogParams> | LogParams['additional'],
	// 	arg3?: Partial<LogParamsWithoutAdditional>
	// ): void => {
	// 	this.log('warn', msg, arg2, arg3);
	// }

	// /**
	//  * Logs {@link msg} using `error` log level.
	//  * 
	//  * Call this function to see overloads and their details.
	//  */
	// logError: LogAliasFn = (
	// 	msg: unknown,
	// 	arg2?: Partial<LogParams> | LogParams['additional'],
	// 	arg3?: Partial<LogParamsWithoutAdditional>
	// ): void => {
	// 	this.log('error', msg, arg2, arg3);
	// }

	// /**
	//  *Logs {@link msg} using {@link level} log level.
	//  * 
	//  * Call this function to see overloads and their details.
	//  */
	// log: LogFn = (
	// 	level: LogLevel,
	// 	msg: unknown,
	// 	arg3?: Partial<LogParams> | LogParams['additional'],
	// 	arg4?: Partial<LogParamsWithoutAdditional>
	// ): void => {
	// 	// setup
	// 	let {
	// 		additional,
	// 		alwaysLogAdditional,
	// 		stringifyAdditional,
	// 		alertMsg,
	// 		throwErr
	// 	}: Partial<LogParams> = {
	// 		additional: undefined,
	// 		alwaysLogAdditional: undefined,
	// 		stringifyAdditional: undefined,
	// 		alertMsg: undefined,
	// 		throwErr: false,
	// 	}

	// 	let isArg3IsParamsObj = false;

	// 	// check arg3
	// 	if (arg3 === undefined) {
	// 		if (alwaysLogAdditional) {
	// 			DEBUG_log('arg3 is figured to be "additional": arg3 is "undefined" and "alwaysLogAdditional" is "true"');

	// 			additional = arg3;
	// 		} else {
	// 			DEBUG_log('arg3 is "undefined", "alwaysLogAdditional" is "false" — so arg3 is neither "additional" nor "params"');
	// 		}
	// 	} else { // arg3 !== undefined
	// 		DEBUG_log('arg3 is not "undefined", currently ambiguous of it being "additional" or "params"');

	// 		// 3rd arg is ambiguous (can be additional or params)
	// 		isArg3IsParamsObj =
	// 			(
	// 				arg4 === undefined
	// 				&& isObject(arg3)
	// 				&& doesObjectOnlyHaveSpecificProps(arg3 as object, paramNames)
	// 			);
	// 		if (isArg3IsParamsObj) {
	// 			DEBUG_log('arg3 is figured to be "params" — "additional", if there, will be extracted');

	// 			// 1st overload, arg3 is params object
	// 			const params = arg3 as Partial<LogParams>;

	// 			additional = objectGetOwnOrFallback(params, 'additional', additional);
	// 			alwaysLogAdditional = objectGetOwnOrFallback(params, 'alwaysLogAdditional', alwaysLogAdditional);
	// 			stringifyAdditional = objectGetOwnOrFallback(params, 'stringifyAdditional', stringifyAdditional);
	// 			if (isObject(stringifyAdditional)) {
	// 				(stringifyAdditional as LogParamsStringifyAdditionalObj).space = fallbackIfNullish(
	// 					(stringifyAdditional as LogParamsStringifyAdditionalObj).space, 2
	// 				);
	// 			}
	// 			alertMsg = objectGetOwnOrFallback(params, 'alertMsg', alertMsg);
	// 			throwErr = objectGetOwnOrFallback(params, 'throwErr', throwErr);
	// 		} else {
	// 			DEBUG_log('arg3 is figured to be "additional"');

	// 			// 2nd overload, arg3 is "additional" data; arg4 may be params object  
	// 			additional = arg3;
	// 		}
	// 	}

	// 	// check arg4
	// 	if (isArg3IsParamsObj) {
	// 		if (arg4) {
	// 			DEBUG_log('arg4 is defined, but "params" were already extracted from arg3 — so, "arg4" will be ignored');
	// 		} else {
	// 			DEBUG_log('arg4 is "undefined", arg3 is "params"');
	// 		}
	// 	} else { // isArg3IsParamsObj === false
	// 		if (arg4) {
	// 			DEBUG_log('arg4 is figured to be "params" without "additional"');

	// 			// arg4 is params object without "additional"
	// 			const params = arg4 as Partial<LogParamsWithoutAdditional>

	// 			alwaysLogAdditional = objectGetOwnOrFallback(params, 'alwaysLogAdditional', alwaysLogAdditional);
	// 			stringifyAdditional = objectGetOwnOrFallback(params, 'stringifyAdditional', stringifyAdditional);
	// 			if (isObject(stringifyAdditional)) {
	// 				(stringifyAdditional as LogParamsStringifyAdditionalObj).space = fallbackIfNullish(
	// 					(stringifyAdditional as LogParamsStringifyAdditionalObj).space, 2
	// 				);
	// 			}
	// 			alertMsg = objectGetOwnOrFallback(params, 'alertMsg', alertMsg);
	// 			throwErr = objectGetOwnOrFallback(params, 'throwErr', throwErr);
	// 		} else {
	// 			DEBUG_log('no "params" were found: arg4 is "undefined" and arg3 has not matched "params" criteria');
	// 		}
	// 	}

	// 	DEBUG_log('-----');

	// 	// main body
	// 	const prefix = `[${level}${this.#prefixBody ? ` | ${this.#prefixBody}` : ''}] `;
	// 	const msgWithPrefix = prefix + msg;
	// 	const logMsg = throwErr !== true;

	// 	if (logMsg)
	// 		console.log(msgWithPrefix);

	// 	const logAdditional = alwaysLogAdditional || additional !== undefined;
	// 	if (logAdditional) {
	// 		if (stringifyAdditional) {
	// 			if (stringifyAdditional === true) // just boolean value
	// 				console.log(prefix + 'additional data:\n', JSON.stringify(additional, null, 2));
	// 			else // an object
	// 				console.log(prefix + 'additional data:\n', JSON.stringify(
	// 					additional,
	// 					// @ts-ignore fuck off
	// 					stringifyAdditional.replacer,
	// 					stringifyAdditional.space)
	// 				);
	// 		} else
	// 			console.log(prefix + 'additional data:\n', additional);
	// 	}

	// 	if (alertMsg && 'alert' in globalThis) {
	// 		const parts = [
	// 			msgWithPrefix
	// 		];

	// 		if (logAdditional)
	// 			parts.push('(see additional data in the console)');
	// 		if (throwErr)
	// 			parts.push('(see an error messaage in the console)');

	// 		let result;
	// 		if (parts.length === 1)
	// 			result = parts[0];
	// 		else
	// 			result = parts[0]
	// 				+ '\n\n'
	// 				+ parts.slice(1).join('\n')

	// 		alert(result);
	// 	}

	// 	if (throwErr) {
	// 		if (typeof throwErr === 'string') // throwing custom message
	// 			throw new Error(prefix + throwErr);
	// 		else if (throwErr instanceof Error) { // throwing the provided error
	// 			throwErr.message = prefix + throwErr.message;
	// 			throw throwErr;
	// 		} else // boolean true -- loggin the message in error itself
	// 			throw new Error(msgWithPrefix);
	// 	}
	// }
} as unknown /*as any*/ as {
	new(): {}
};

let l = new Logger();

export default Logger;