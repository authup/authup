/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function requireFromEnv(key : string, alt?: any) {
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

export function requireBooleanFromEnv(key: string, alt?: boolean) : boolean | undefined {
    const value = requireFromEnv(key, alt);

    if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') {
            return true;
        }

        if (value.toLowerCase() === 'false') {
            return false;
        }
    }

    if (typeof value === 'boolean') {
        return value;
    }

    return alt ?? !!value;
}

export function requireIntegerFromEnv(key: string, alt?: number) : number | undefined {
    const value = requireFromEnv(key, alt);
    const intValue = parseInt(value, 10);
    if (Number.isNaN(intValue)) {
        return alt;
    }

    return intValue;
}
