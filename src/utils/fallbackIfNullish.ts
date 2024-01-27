export function fallbackIfNullish<V, F>(value: V, fallbackValue: F): V | F  {
    return (value === undefined || value === null) ? fallbackValue : value;
}