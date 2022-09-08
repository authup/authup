/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '@authelion/common';

export function hasEnv(key: string) : boolean {
    return hasOwnProperty(process.env, key);
}

export function requireFromEnv(key: string, alt?: any) {
    if (
        typeof process.env[key] === 'undefined' &&
        typeof alt === 'undefined'
    ) {
        // eslint-disable-next-line no-console
        console.error(`[APP ERROR] Missing variable: ${key}`);

        return process.exit(1);
    }

    return process.env[key] ?? alt;
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

    return alt ?? !!value;
}

export function requireIntegerFromEnv(key: string, alt?: number): number | undefined {
    const value = requireFromEnv(key, alt);
    const intValue = parseInt(value, 10);

    if (Number.isNaN(intValue)) {
        return alt;
    }

    return intValue;
}
