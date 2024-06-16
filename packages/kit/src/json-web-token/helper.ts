/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { clone, isEqual, isObject } from 'smob';
import type { JWTClaims } from './types';

export function getJWTClaimValueByMapping(
    claims: JWTClaims,
    mappingKey: string,
    mappingValue?: unknown,
    mappingValueIsRegex?: boolean,
) : unknown | unknown[] | undefined {
    const path = mappingKey.split('\\.');
    let raw = clone(claims);
    for (let i = 0; i < path.length; i++) {
        if (!isObject(raw)) {
            continue;
        }

        raw = raw[path[i]];
    }

    if (!raw) {
        return undefined;
    }

    if (Array.isArray(raw)) {
        raw = raw.filter(Boolean);
    }

    if (!mappingValue) {
        return raw;
    }

    let regex : RegExp | undefined;
    if (mappingValueIsRegex && typeof mappingValue === 'string') {
        regex = new RegExp(mappingValue, 'gi');
    } else if (mappingValue instanceof RegExp) {
        regex = mappingValue;
    }

    if (regex) {
        if (Array.isArray(raw)) {
            return raw
                .filter((el) => typeof el === 'string' && regex.test(el));
        }

        if (
            typeof raw === 'string' &&
                regex.test(raw)
        ) {
            return raw;
        }

        return undefined;
    }

    if (Array.isArray(raw)) {
        const output : unknown[] = [];

        for (let j = 0; j < raw.length; j++) {
            if (isEqual(raw[j], mappingValue)) {
                output.push(raw[j]);
            }
        }

        return output;
    }

    if (isEqual(raw, mappingValue)) {
        return raw;
    }

    return undefined;
}
