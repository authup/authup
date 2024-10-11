/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { expandPath, getPathInfo } from 'pathtrace';
import { isEqual } from 'smob';
import type { JWTClaims } from './types';

/**
 * Return all matching claim values by certain conditions.
 * Always returns an array.
 *
 * @param claims
 * @param pattern
 * @param equalTo
 * @param equalToIsRegex
 */
export function getJWTClaimByPattern(
    claims: JWTClaims,
    pattern: string,
    equalTo?: unknown,
    equalToIsRegex?: boolean,
) : unknown[] {
    const output : unknown[] = [];

    const keys = expandPath(claims, pattern);
    for (let i = 0; i < keys.length; i++) {
        const info = getPathInfo(claims, keys[i]);
        if (!info.exists) {
            continue;
        }

        if (typeof equalTo === 'undefined' || equalTo === null) {
            output.push(info.value);
            continue;
        }

        let regex : RegExp | undefined;
        if (equalToIsRegex && typeof equalTo === 'string') {
            regex = new RegExp(equalTo, 'gi');
        } else if (equalTo instanceof RegExp) {
            regex = equalTo;
        }

        if (regex) {
            if (regex.test(`${info.value}`)) {
                output.push(info.value);
            }

            continue;
        }

        if (isEqual(equalTo, info.value)) {
            output.push(info.value);
        }
    }

    return output;
}
