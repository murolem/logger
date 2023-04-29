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
const _Logger = class {
  constructor(...prefix) {
    __privateAdd(this, _prefixParts, []);
    __privateAdd(this, _prefixBody, void 0);
    __publicField(this, "appendPrefix", (...prefix) => {
      __privateGet(this, _prefixParts).push(...prefix);
      __privateSet(this, _prefixBody, __privateGet(this, _prefixParts).join(" > "));
      return this;
    });
    __publicField(this, "clone", () => {
      return new _Logger(...__privateGet(this, _prefixParts));
    });
    __publicField(this, "cloneAndAppendPrefix", (...prefix) => {
      return this.clone().appendPrefix(...prefix);
    });
    __publicField(this, "logDebug", (msg, params = {}) => {
      this.log("debug", msg, params);
    });
    __publicField(this, "logInfo", (msg, params = {}) => {
      this.log("info", msg, params);
    });
    __publicField(this, "logWarn", (msg, params = {}) => {
      this.log("warn", msg, params);
    });
    __publicField(this, "logError", (msg, params = {}) => {
      this.log("error", msg, params);
    });
    __publicField(this, "log", (level, msg, {
      additional = void 0,
      alwaysLogAdditional,
      stringifyAdditional,
      alertMsg,
      throwErr = false
    } = {}) => {
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
  }
};
let Logger = _Logger;
_prefixParts = new WeakMap();
_prefixBody = new WeakMap();
export {
  Logger as default
};
