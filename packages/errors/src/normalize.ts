/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isError } from './check.ts';

/**
 * Normalize an arbitrary thrown value into an `Error` instance.
 *
 * Useful at error-pipeline boundaries (catch blocks, error middleware,
 * fallbacks) where TypeScript hands you `unknown` but downstream code
 * wants a real `Error` to inspect or rethrow. Duck-typed: any value
 * passing `isError` is returned as-is. Strings become `new Error(str)`;
 * any other value is stringified.
 */
export function normalizeError(input: unknown): Error {
    if (isError(input)) {
        return input;
    }

    if (typeof input === 'string') {
        return new Error(input);
    }

    return new Error(String(input));
}

