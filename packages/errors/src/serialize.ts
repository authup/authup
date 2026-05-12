/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';

/**
 * Convert an `Error` (or any value with a `toJSON()` method) into a
 * plain object suitable for embedding in a JSON response body.
 *
 * Calls `input.toJSON()` if present — preserves every attribute the
 * error chose to surface (`code`, `cause`, `errors`, `issues`, `data`,
 * AuthupError sub-class fields, ...). Falls back to spreading the
 * Error's enumerable own properties alongside the standard
 * `name` / `message` pair, so caller-attached fields survive.
 *
 * Pair with `normalizeError` to handle arbitrary thrown values:
 * `serializeError(normalizeError(e))`.
 */
export function serializeError(input: Error): Record<string, any> {
    if ('toJSON' in input && typeof input.toJSON === 'function') {
        const output = input.toJSON();
        if (isObject(output)) {
            return output;
        }
    }

    return {
        ...input,
        name: input.name,
        message: input.message,
    };
}
