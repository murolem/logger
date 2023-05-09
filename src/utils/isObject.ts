export function isObject(value: unknown) {
    return value !== null && value?.constructor?.name === "Object"
}