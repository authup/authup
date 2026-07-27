/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    isBaseError,
    isObject,
    isError as isRawError,
    matchesInstanceof,
} from '@ebec/core';
import type { AuthupError } from './module.ts';
import { AUTHUP_ERROR_INSTANCE } from './module.ts';

/**
 * Duck-type guard for `Error`.
 *
 * Re-exports `@ebec/core`'s shape-based check: `input` matches when it
 * carries the standard `name` / `message` / `stack` triplet, regardless
 * of which realm or class hierarchy produced it. Use this instead of
 * `instanceof Error` for cross-realm boundaries (worker threads,
 * duplicate-module copies) where `instanceof` can yield false negatives.
 */
export function isError(input: unknown): input is Error {
    return isRawError(input);
}

/**
 * Duck-type guard for AuthupError.
 *
 * Fast path: input has the AuthupError marker in its `@instanceof` chain —
 * as the native symbol (in-process) or its serialized string form
 * (JSON-rehydrated). Subclass instances also accumulate this marker, so this
 * guard matches any AuthupError subclass (`OAuth2Error`, `JWTError`, etc.).
 *
 * Slow path: input is shape-compatible with AuthupError (BaseError + has
 * `issues: Issue[]`). Catches cases where the marker is missing — plain
 * objects rehydrated from JSON emitted by older builds without the chain.
 */
export function isAuthupError(input: unknown): input is AuthupError {
    if (matchesInstanceof(input, AUTHUP_ERROR_INSTANCE)) {
        return true;
    }

    if (!isBaseError(input)) {
        return false;
    }

    if (!isObject(input)) {
        return false;
    }

    return Array.isArray(input.issues);
}
