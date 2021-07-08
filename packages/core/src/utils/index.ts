export function hasOwnProperty<X extends {}, Y extends PropertyKey>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
    return obj.hasOwnProperty(prop);
}

export function removeDuplicateForwardSlashes(str: string) {
    return str.replace(/([^:]\/)\/+/g, "$1");
}
