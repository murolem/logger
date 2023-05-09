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
export function doesObjectOnlyHaveSpecificProps(obj: object, props: (string)[], {
    emptyObjectSatisfies = false,
    fullMatchRequired = false
}: Partial<{
    /** 
     * Does empty object `obj` (no props) satisfies the condition?
     * 
     * @default false
     */
    emptyObjectSatisfies: boolean,
    /**
     * If `obj` only has some of `props`, return `true`?
     * 
     * @default false
     */
    fullMatchRequired: boolean
}> = {}): boolean {
    const propsSet = new Set(props);
    const ownProps = Object.keys(obj);

    // check if object has more properties than there are `props`
    if(ownProps.length > propsSet.size)
        return false;
    else if (ownProps.length === 0)
        // check for empty object
        return emptyObjectSatisfies;

    // check for each prop individually
    const doOwnPropsMatchGivenProps = ownProps.every(ownProp => propsSet.has(ownProp));
    if(!doOwnPropsMatchGivenProps)
        // if there is mismatch in props
        return false;

    return fullMatchRequired 
        // if full match is required, check if size is the same (i.e. composition of props is equal) — if not, return `false`
        ? ownProps.length === propsSet.size
        // if no full match is required, all checks were already made and so — return `true`
        : true;
}