/*
 * Copyright (c) 2022.
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

export function requireBooleanFromEnv(key: string, alt?: boolean) {
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
