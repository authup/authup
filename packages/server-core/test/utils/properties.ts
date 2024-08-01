/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function expectPropertiesEqualToSrc<T extends Record<string, any>>(
    src: T,
    dest: Record<string, any>,
    ignore?: (keyof T)[],
) {
    const keys = Object.keys(src);
    for (let i = 0; i < keys.length; i++) {
        if (ignore && ignore.indexOf(keys[i]) !== -1) {
            continue;
        }

        expect(dest[keys[i]]).toEqual(src[keys[i]]);
    }
}
