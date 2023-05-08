/**
 * Checks if given object `obj` only has `props` properties and notning more.
 * 
 * If `obj` has no props, will return `true`.
 * 
 * **NOTE:** this might fail if `props` has duplicate props.
 * 
 * @param obj an object.
 * @param props properties that object might have.
 */
export function objectHasOwnOnly(obj: object, props: (string)[]): boolean {
    const ownProps = Object.keys(obj);
    
    // check if object already has more properties than possible
    if(ownProps.length > props.length)
        return false;

    // check for each prop individually
    for(let i = 0; i < ownProps.length; i++) {
        if(!props.includes(ownProps[i]))
            return false;
    }

    return true;
}