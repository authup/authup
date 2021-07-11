export function hasOwnProperty<X extends {}, Y extends PropertyKey>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
    return obj.hasOwnProperty(prop);
}

export function removeDuplicateForwardSlashesFromURL(str: string) : string {
    const url = new URL(str);

    return url.protocol+'//'+(url.host + url.pathname).replace(/([^:]\/)\/+/g, "$1") + url.search;
}
