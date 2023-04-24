export type MessageLogParams = {
	/**
	 * Дополнительное значение для логгирования — может быть чем угодно (строка, объект и т.п.), исключая `undefined`.
	 * Будет залогированно ниже основного значения, но до сообщения об ошибке (при наличии).
	 * 
	 * К началу сообщения будет добавлена строка с префиксом (при наличии), текстом `[тут_префикс] дополнительные данные:` и переносом строки.
	 * 
	 * Если необходимо залоггировать `undefined`, задай {@link MessageLogParams.alwaysLogAdditional alwaysLogAdditional} в `true` — 
	 * `undefined` будет логгироваться даже если это значение не задано.
	 * 
	 * @default undefined
	 */
	additional: any,

	/**
	 * Логгировать ли содержимое {@link MessageLogParams.additional additional} если оно `undefined`?
	 * 
	 * @default false
	 */
	alwaysLogAdditional: boolean | Partial<{
		/** 
		 * A function that transforms the results or an array of strings and numbers 
		 * that acts as an approved list for selecting the object properties that will be stringified. 
		 */
		replacer: ((this: any, key: string, value: any) => any) | (number | string)[] | null,
		/** 
		 * Adds indentation, white space, and line break characters to the 
		 * return-value JSON text to make it easier to read. 
		 */
		space: string | number
	}>,

	/**
	 * Конвертирует значение {@link MessageLogParams.additional additional} в строку используя метод {@link JSON.stringify}.
	 * 
	 * @throw `TypeError`
	 * 
	 * Если значение {@link MessageLogParams.additional additional} содержит циклические ссылки или является типом {@link BigInt} 
	 * 
	 * @default false
	 */
	stringifyAdditional: boolean,

	/**
	 * Позволяет выбросить исключение **после** сообщения или **вместо** него. Значение (и его тип) задают содержимое исключения:
	 * - `boolean`:
	 *    - если `true`, будет выброшено исключение с текстом основного сообщения `msg`, при этом основное сообщение **не будет** залогированно.
	 *    - если `false`, исключения выброшено не будет.
	 * - `Error` — объект исключения; будет выброшен как есть.
	 * - `string` — текст исключения; будет создано новое исключение с этим текстом, оно будет выброшено после основного сообщения `msg`.
	 * 
	 * Хорошая практика — выбрасывать исключение только если логгируется сообщение с уровнем `error` — 
	 * это позволит понять что что-то идет не так, если исключение было выброшено с другим уровнем логгирования.
	 * 
	 * @default false
	 */
	throwErr: boolean | Error | string,

	/**
	 * Показать ли всплывающее окно через `alert()` браузера для отображения основного сообщения `msg` и содержимого ошибки `throwErr` (при наличии)?
	 * 
	 * Всплывающее окно будет показано после логгирования, но перед выбрасиванием исключения `throwErr` (при наличии).
	 * 
	 * @default false
	 */
	alertMsg: boolean
}

/**
 * Уровень логгирования:
 * - `debug` — отладочные данные; рекомендуется использовать только в разработке или тестировании.
 * - `info` — любая информация, не являющаяся отладочной или предупреждением/ошибкой.
 * - `warn` — предупреждения.
 * - `error` ошибки.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Тип для алиасов функций-логгеров для разных уровнев логгирования.
 */
export type LogAliasFn = (msg: string, params?: Partial<MessageLogParams>) => void;

/**
 * Утилита для логгирования.
 * 
 * (см. конструктор за деталями).
 */
export class Logger  {
	/**
	 * Массив строк, составляющих префикс.
	 */
	#prefixParts: string[] = [];
	/**
	 * Тело префикса без уровня логгирования или ограничивающих символов в виде простой строки. 
	 */
	#prefixBody: string | undefined;

	/**
	 * Утилита для логгирования.
	 * 
	 * @param prefix Префикс для использования в каждом логгируемом сообщении. 
	 * 
	 * Если задан массив — каждое значние будет отдельной частью префикса. По умолчанию не задан.
	 * 
	 * Можно добавить новые части через {@link appendPrefix} или создать копию этого класса через {@link cloneAndAppendPrefix}.
	 * 
	 * При логгировании выглядит как: `[префикс1 > префикс 2]`.
	 * 
	 * ---
	 */
	constructor(...prefix: string[]) {
		this.appendPrefix(...prefix);
	}

	/**
	 * Добавляет новый префикс (или несколько, если это массив) к уже используемым префиксам.
	 * 
	 * См. конструктор за подробностями.
	 * 
	 * @param prefix префикс или массив префиксов.
	 * @returns инстанс этого класса.
	 */
	appendPrefix(...prefix: string[]): Logger {
		this.#prefixParts.push(...prefix);
		this.#prefixBody = this.#prefixParts.join(' > ');

		return this;
	}

	/**
	 * Создает копию этого класса с используемыми в нем префиксами.
	 * 
	 * @returns новый инстанс-копию этого класса.
	 */
	clone = () => {
		return new Logger(...this.#prefixParts);
	}

	/**
	 * Создает копию этого класса с используемыми в нем префиксами, добавляя к ним заданный префикс или массив префиксов `prefix`.
	 * 
	 * @param prefix префикс или массив префиксов.
	 * @returns новый инстанс-копию этого класса.
	 */
	cloneAndAppendPrefix(...prefix: string[]) {
		return this.clone().appendPrefix(...prefix);
	}

	/**
	 * Логгирует сообщение {@link msg} с уровнем `debug` и параметрами `params` (при наличии).
	 * 
	 * @param msg логгируемое сообщение.
	 * @param params дополнительные параметры.
	 */
	logDebug = (msg: string, params: Partial<MessageLogParams> = {}): void => {
		this.log('debug', msg, params);
	}

	/**
	 * Логгирует сообщение {@link msg} с уровнем `info` и параметрами `params` (при наличии).
	 * 
	 * @param msg логгируемое сообщение.
	 * @param params дополнительные параметры.
	 */
	logInfo = (msg: string, params: Partial<MessageLogParams> = {}): void => {
		this.log('info', msg, params);
	}

	/**
	 * Логгирует сообщение {@link msg} с уровнем `warn` и параметрами `params` (при наличии).
	 * 
	 * @param msg логгируемое сообщение.
	 * @param params дополнительные параметры.
	 */
	logWarn = (msg: string, params: Partial<MessageLogParams> = {}): void => {
		this.log('warn', msg, params);
	}

	/**
	 * Логгирует сообщение {@link msg} с уровнем `error`
	 * 
	 * @param msg логгируемое сообщение.
	 * @param params дополнительные параметры.
	 */
	logError = (msg: string, params: Partial<MessageLogParams> = {}): void => {
		this.log('error', msg, params);
	}

	/**
	 * Логгирует сообщение {@link msg} с уровнем {@link level}.
	 * 
	 * @param level Уровень логгирования.
	 * @param msg Сообщение.
	 */
	log(level: LogLevel, msg: string, {
		additional = undefined,
		alwaysLogAdditional = false,
		stringifyAdditional = false,
		alertMsg = false,
		throwErr = false
	}: Partial<MessageLogParams> = {}) {
		const prefix = `[${level}${this.#prefixBody ? ` | ${this.#prefixBody}` : ''}] `;
		const msgWithPrefix = prefix + msg;
		const logMsg = throwErr !== true;

		if(logMsg)
			console.log(msgWithPrefix);
	
		const logAdditional = alwaysLogAdditional || additional !== undefined;
		if(logAdditional)
			console.log(prefix + 'дополнительные данные:\n',
				stringifyAdditional ? JSON.stringify(additional, null, 2) : additional);
		
		if(alertMsg) {
			const parts = [
				msgWithPrefix// + '\n\n'
			];

			if(logAdditional)
				parts.push('(см. дополнительные данные в консоли)');
			if(throwErr)
				parts.push('(см. сообщение об ошибке в консоли)');

			let result;
			if(parts.length === 1)
				result = parts[0];
			else
				result = parts[0] 
				+ '\n\n' 
				+ parts.slice(1).join('\n')

			alert(result);
		}
		
		if(throwErr) {
			if(typeof throwErr === 'string') // throwing custom message
				throw new Error(prefix + throwErr);
			else if (throwErr instanceof Error) { // throwing the provided error
				throwErr.message = prefix + throwErr.message;
				throw throwErr;
			} else // boolean true -- loggin the message in error itself
				throw new Error(msgWithPrefix);
		}
	}
}