/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { expect } from 'vitest';

export function expectPropertiesEqualToSrc<T extends Record<string, any>>(
    src: T,
    dest: Record<string, any>,
    ignore?: (keyof T)[],
) {
    const keys = Object.keys(src);
    for (const key of keys) {
        if (ignore && ignore.includes(key)) {
            continue;
        }

        expect(dest[key]).toEqual(src[key]);
    }
}
