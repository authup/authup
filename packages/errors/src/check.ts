/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    INSTANCEOF_PROPERTY,
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
 * Fast path: input carries an `@instanceof` chain. The chain decides, and
 * only the chain: it matches when the AuthupError marker is in it, as the
 * native symbol (in-process) or its serialized string form
 * (JSON-rehydrated). Subclass instances accumulate this marker, so any
 * AuthupError subclass (`OAuth2Error`, `JWTError`, ...) matches too, while
 * a foreign `@ebec/core` error (rapiq's ParseError, which since 2.2 also
 * carries an `issues` array) does not: it announced its ancestry and
 * AuthupError is not in it.
 *
 * Slow path, for a chain-less input only: shape-compatible with AuthupError
 * (BaseError + `issues: Issue[]`). Covers plain objects rehydrated from JSON
 * emitted by older builds, before the chain rode along.
 */
export function isAuthupError(input: unknown): input is AuthupError {
    if (!isObject(input)) {
        return false;
    }

    if (Array.isArray(input[INSTANCEOF_PROPERTY])) {
        return matchesInstanceof(input, AUTHUP_ERROR_INSTANCE);
    }

    if (!isBaseError(input)) {
        return false;
    }

    return Array.isArray(input.issues);
}
