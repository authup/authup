/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasInstanceof, isBaseError, isObject } from '@ebec/core';
import type { AuthupError } from './module.ts';
import { AUTHUP_ERROR_INSTANCE } from './module.ts';

/**
 * Duck-type guard for AuthupError.
 *
 * Fast path: input has the AuthupError marker in its `@instanceof` chain.
 * Subclass instances also accumulate this marker, so this guard matches any
 * AuthupError subclass (`OAuth2Error`, `JWTError`, etc.).
 *
 * Slow path: input is shape-compatible with AuthupError (BaseError + has
 * `issues: Issue[]`). Catches cases where the marker is missing — plain
 * objects rehydrated from JSON, older builds without the marker.
 */
export function isAuthupError(input: unknown): input is AuthupError {
    if (hasInstanceof(input, AUTHUP_ERROR_INSTANCE)) {
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
