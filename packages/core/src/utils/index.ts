/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function hasOwnProperty<X extends Record<string, any>, Y extends PropertyKey>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}

export function removeDuplicateForwardSlashesFromURL(str: string) : string {
    const url = new URL(str);

    return `${url.protocol}//${(url.host + url.pathname).replace(/([^:]\/)\/+/g, '$1')}${url.search}`;
}
