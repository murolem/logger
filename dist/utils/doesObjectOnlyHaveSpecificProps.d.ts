/**
 * Checks if given object `obj` only has `props` properties, but no others.
 *
 * If `obj` has only some of the props, will still return `true`.
 * This can be changed to returning `false` by setting `fullMatchRequired` option to `true`.
 *
 * If `obj` has no props, `false` will be returned.
 * This can be changed to returning `true` by setting `emptyObjectSatisfies` to `true`.
 *
 * **NOTE:** this might fail if `props` has duplicate props.
 *
 * @param obj an object.
 * @param props properties that object might have. duplicates are ignored.
 */
export declare function doesObjectOnlyHaveSpecificProps(obj: object, props: (string)[], { emptyObjectSatisfies, fullMatchRequired }?: Partial<{
    /**
     * Does empty object `obj` (no props) satisfies the condition?
     *
     * @default false
     */
    emptyObjectSatisfies: boolean;
    /**
     * If `obj` only has some of `props`, return `true`?
     *
     * @default false
     */
    fullMatchRequired: boolean;
}>): boolean;
