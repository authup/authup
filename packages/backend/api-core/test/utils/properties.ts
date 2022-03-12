/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function expectPropertiesEqualToSrc(
    src: Record<string, any>,
    dest: Record<string, any>,
) {
    const keys = Object.keys(src);
    for (let i = 0; i < keys.length; i++) {
        expect(dest[keys[i]]).toEqual(src[keys[i]]);
    }
}
