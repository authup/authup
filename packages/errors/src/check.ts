/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    INSTANCEOF_PROPERTY,
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
 * The chain decides, and only the chain: it matches when the AuthupError
 * marker is in it, as the native symbol (in-process) or its serialized
 * string form (JSON-rehydrated). Subclass instances accumulate this
 * marker, so any AuthupError subclass (`OAuth2Error`, `JWTError`, ...)
 * matches too, while a foreign `@ebec/core` error (rapiq's ParseError,
 * which since 2.2 also carries an `issues` array) does not: it announced
 * its ancestry and AuthupError is not in it.
 *
 * Chain-less input never matches. A shape-based fallback for pre-chain
 * JSON (`BaseError` + `issues: Issue[]`) used to cover that case, but
 * `@ebec/core`'s `isBaseError` became chain-only, so that fallback could
 * never fire — and now that every `BaseError` carries an `issues` array,
 * the shape it checked for would no longer distinguish an AuthupError
 * from any other ebec-derived error anyway. There is no reliable way left
 * to recognise a chain-less legacy payload as specifically an AuthupError.
 */
export function isAuthupError(input: unknown): input is AuthupError {
    if (!isObject(input)) {
        return false;
    }

    if (!Array.isArray(input[INSTANCEOF_PROPERTY])) {
        return false;
    }

    return matchesInstanceof(input, AUTHUP_ERROR_INSTANCE);
}
