export function objectGetOwnOrFallback<
    O extends object,
    K extends keyof O,
    F extends any,
>(obj: O, property: K, fallbackValue: F): O[K] | F {
    return Object.hasOwn(obj, property) ? obj[property] : fallbackValue
}