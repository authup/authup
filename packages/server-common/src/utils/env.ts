/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '@authup/common';
import { useLogger } from '../logger';

export function hasEnv(key: string) : boolean {
    return hasOwnProperty(process.env, key);
}

export function requireFromEnv<T>(key: string, alt?: T) : T | string {
    if (
        typeof process.env[key] === 'undefined' &&
        typeof alt === 'undefined'
    ) {
        useLogger().error(`Missing variable: ${key}`);

        return process.exit(1);
    }

    return (process.env[key] ?? alt) as T | string;
}

export function requireBooleanFromEnv(key: string, alt?: boolean): boolean | undefined {
    const value = requireFromEnv(key, alt);

    switch (value) {
        case true:
        case 'true':
        case 't':
        case '1':
            return true;
        case false:
        case 'false':
        case 'f':
        case '0':
            return false;
    }

    return alt;
}

export function requireBoolOrStringFromEnv(
    key: string,
    alt?: boolean | string,
) : boolean | string | undefined {
    if (hasEnv(key)) {
        const value = requireBooleanFromEnv(key, undefined);
        if (typeof value === 'undefined') {
            return requireFromEnv(key, alt);
        }

        return value;
    }

    return alt;
}

export function requireIntegerFromEnv(key: string, alt?: number): number | undefined {
    const value = requireFromEnv(key, alt);
    const intValue = parseInt(`${value}`, 10);

    if (Number.isNaN(intValue)) {
        return alt;
    }

    return intValue;
}
