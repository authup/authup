/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function pickRecord(data: Record<string, any>, keys: string[]) {
    const output : Record<string, any> = {};
    for (let i = 0; i < keys.length; i++) {
        output[keys[i]] = data[keys[i]];
    }

    return output;
}

export function omitRecord(data: Record<string, any>, keys: string[]) {
    const dataKeys = Object.keys(data);
    let index : number;
    const output : Record<string, any> = {};
    for (let i = 0; i < dataKeys.length; i++) {
        index = keys.indexOf(dataKeys[i]);
        if (index !== -1) {
            continue;
        }
        output[dataKeys[i]] = data[dataKeys[i]];
    }

    return output;
}
