var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var _prefixParts, _prefixBody;
const paramNames = [
  "additional",
  "alwaysLogAdditional",
  "stringifyAdditional",
  "throwErr",
  "alertMsg"
];
function isObject(value) {
  var _a;
  return value !== null && ((_a = value == null ? void 0 : value.constructor) == null ? void 0 : _a.name) === "Object";
}
function noop(...args) {
}
function objectGetOwnOrFallback(obj, property, fallbackValue) {
  return Object.hasOwn(obj, property) ? obj[property] : fallbackValue;
}
function doesObjectOnlyHaveSpecificProps(obj, props, {
  emptyObjectSatisfies = false,
  fullMatchRequired = false
} = {}) {
  const propsSet = new Set(props);
  const ownProps = Object.keys(obj);
  if (ownProps.length > propsSet.size)
    return false;
  else if (ownProps.length === 0)
    return emptyObjectSatisfies;
  const doOwnPropsMatchGivenProps = ownProps.every((ownProp) => propsSet.has(ownProp));
  if (!doOwnPropsMatchGivenProps)
    return false;
  return fullMatchRequired ? ownProps.length === propsSet.size : true;
}
const _Logger = class {
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
  constructor(...prefix) {
    /**
     * An array of strings composing the prefix.
     */
    __privateAdd(this, _prefixParts, []);
    /**
     * A prefix ready-to-be-used. Upadtes when prefix changes. 
     */
    __privateAdd(this, _prefixBody, void 0);
    /**
     * Append a new prefix to current ones.
     * 
     * @param prefix prefix or multiple prefixes.
     * @returns this.
     */
    __publicField(this, "appendPrefix", (...prefix) => {
      __privateGet(this, _prefixParts).push(...prefix);
      __privateSet(this, _prefixBody, __privateGet(this, _prefixParts).join(" > "));
      return this;
    });
    /**
     * Creates a copy of this class (prefixes are kept!).
     * 
     * @returns a new {@link Logger} instance.
     */
    __publicField(this, "clone", () => {
      return new _Logger(...__privateGet(this, _prefixParts));
    });
    /**
     * Creates a copy of this class (prefixes are kept!) and appends to it a new prefix or multiple prefixes.
     * 
     * @param prefix prefix or multiple prefixes.
     * @returns a new {@link Logger} instance.
     */
    __publicField(this, "cloneAndAppendPrefix", (...prefix) => {
      return this.clone().appendPrefix(...prefix);
    });
    /**
     * Logs {@link msg} using `debug` log level.
     * 
     * Call this function to see overloads and their details.
     */
    __publicField(this, "logDebug", (msg, arg2, arg3) => {
      this.log("debug", msg, arg2, arg3);
    });
    /**
     * Logs {@link msg} using `info` log level.
     * 
     * Call this function to see overloads and their details.
     */
    __publicField(this, "logInfo", (msg, arg2, arg3) => {
      this.log("info", msg, arg2, arg3);
    });
    /**
     * Logs {@link msg} using `warn` log level.
     * 
     * Call this function to see overloads and their details.
     */
    __publicField(this, "logWarn", (msg, arg2, arg3) => {
      this.log("warn", msg, arg2, arg3);
    });
    /**
     * Logs {@link msg} using `error` log level.
     * 
     * Call this function to see overloads and their details.
     */
    __publicField(this, "logError", (msg, arg2, arg3) => {
      this.log("error", msg, arg2, arg3);
    });
    /**
     *Logs {@link msg} using {@link level} log level.
     * 
     * Call this function to see overloads and their details.
     */
    __publicField(this, "log", (level, msg, arg3, arg4) => {
      let {
        additional,
        alwaysLogAdditional,
        stringifyAdditional,
        alertMsg,
        throwErr
      } = {
        additional: void 0,
        alwaysLogAdditional: void 0,
        stringifyAdditional: void 0,
        alertMsg: void 0,
        throwErr: false
      };
      let isArg3IsParamsObj = false;
      if (arg3 === void 0) {
        if (alwaysLogAdditional) {
          DEBUG_log('arg3 is figured to be "additional": arg3 is "undefined" and "alwaysLogAdditional" is "true"');
          additional = arg3;
        } else {
          DEBUG_log('arg3 is "undefined", "alwaysLogAdditional" is "false" — so arg3 is neither "additional" nor "params"');
        }
      } else {
        DEBUG_log('arg3 is not "undefined", currently ambiguous of it being "additional" or "params"');
        isArg3IsParamsObj = arg4 === void 0 && isObject(arg3) && doesObjectOnlyHaveSpecificProps(arg3, paramNames);
        if (isArg3IsParamsObj) {
          DEBUG_log('arg3 is figured to be "params" — "additional", if there, will be extracted');
          const params = arg3;
          additional = objectGetOwnOrFallback(params, "additional", additional);
          alwaysLogAdditional = objectGetOwnOrFallback(params, "alwaysLogAdditional", alwaysLogAdditional);
          stringifyAdditional = objectGetOwnOrFallback(params, "stringifyAdditional", stringifyAdditional);
          alertMsg = objectGetOwnOrFallback(params, "alertMsg", alertMsg);
          throwErr = objectGetOwnOrFallback(params, "throwErr", throwErr);
        } else {
          DEBUG_log('arg3 is figured to be "additional"');
          additional = arg3;
        }
      }
      if (isArg3IsParamsObj) {
        if (arg4) {
          DEBUG_log('arg4 is defined, but "params" were already extracted from arg3 — so, "arg4" will be ignored');
        } else {
          DEBUG_log('arg4 is "undefined", arg3 is "params"');
        }
      } else {
        if (arg4) {
          DEBUG_log('arg4 is figured to be "params" without "additional"');
          const params = arg4;
          alwaysLogAdditional = objectGetOwnOrFallback(params, "alwaysLogAdditional", alwaysLogAdditional);
          stringifyAdditional = objectGetOwnOrFallback(params, "stringifyAdditional", stringifyAdditional);
          alertMsg = objectGetOwnOrFallback(params, "alertMsg", alertMsg);
          throwErr = objectGetOwnOrFallback(params, "throwErr", throwErr);
        } else {
          DEBUG_log('no "params" were found: arg4 is "undefined" and arg3 has not matched "params" criteria');
        }
      }
      DEBUG_log("-----");
      const prefix = `[${level}${__privateGet(this, _prefixBody) ? ` | ${__privateGet(this, _prefixBody)}` : ""}] `;
      const msgWithPrefix = prefix + msg;
      const logMsg = throwErr !== true;
      if (logMsg)
        console.log(msgWithPrefix);
      const logAdditional = alwaysLogAdditional || additional !== void 0;
      if (logAdditional) {
        if (stringifyAdditional) {
          if (stringifyAdditional === true)
            console.log(prefix + "additional data:\n", JSON.stringify(additional));
          else
            console.log(
              prefix + "additional data:\n",
              JSON.stringify(
                additional,
                // @ts-ignore fuck off
                stringifyAdditional.replacer,
                stringifyAdditional.space
              )
            );
        } else
          console.log(prefix + "additional data:\n", additional);
      }
      if (alertMsg) {
        const parts = [
          msgWithPrefix
        ];
        if (logAdditional)
          parts.push("(see additional data in the console)");
        if (throwErr)
          parts.push("(see an error messaage in the console)");
        let result;
        if (parts.length === 1)
          result = parts[0];
        else
          result = parts[0] + "\n\n" + parts.slice(1).join("\n");
        alert(result);
      }
      if (throwErr) {
        if (typeof throwErr === "string")
          throw new Error(prefix + throwErr);
        else if (throwErr instanceof Error) {
          throwErr.message = prefix + throwErr.message;
          throw throwErr;
        } else
          throw new Error(msgWithPrefix);
      }
    });
    this.appendPrefix(...prefix);
    if (!globalThis["DEBUG_log"])
      globalThis["DEBUG_log"] = noop;
  }
};
let Logger = _Logger;
_prefixParts = new WeakMap();
_prefixBody = new WeakMap();
export {
  Logger as default
};
