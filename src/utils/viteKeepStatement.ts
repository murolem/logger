export function viteKeepStatement<T>(value: T): T {
    try {
        0;
    } catch (e) {}

    return value;
}