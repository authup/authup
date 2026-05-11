/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isAuthupError } from '../check.ts';
import { ErrorCode } from '../constants.ts';
import { hasInstanceof } from '../instanceof.ts';
import { AUTH_HEADER_ERROR_INSTANCE, type AuthHeaderError } from './auth-header.ts';
import { BAD_REQUEST_ERROR_INSTANCE, type BadRequestError } from './bad-request.ts';
import { BEARER_TOKEN_MALFORMED_ERROR_INSTANCE, type BearerTokenMalformedError } from './bearer-token.ts';
import { ENTITY_CONFLICT_ERROR_INSTANCE, type EntityConflictError } from './entity-conflict.ts';
import { ENTITY_NOT_FOUND_ERROR_INSTANCE, type EntityNotFoundError } from './entity-not-found.ts';
import { INTERNAL_ERROR_INSTANCE, type InternalError } from './internal.ts';
import { UNAUTHORIZED_ERROR_INSTANCE, type UnauthorizedError } from './unauthorized.ts';

export function isAuthHeaderError(input: unknown): input is AuthHeaderError {
    if (hasInstanceof(input, AUTH_HEADER_ERROR_INSTANCE)) return true;
    if (!isAuthupError(input)) return false;
    return input.code === ErrorCode.HTTP_HEADER_AUTH_TYPE_UNSUPPORTED;
}

export function isBearerTokenMalformedError(input: unknown): input is BearerTokenMalformedError {
    if (hasInstanceof(input, BEARER_TOKEN_MALFORMED_ERROR_INSTANCE)) return true;
    if (!isAuthupError(input)) return false;
    return input.code === ErrorCode.HTTP_BEARER_TOKEN_MALFORMED;
}

export function isBadRequestError(input: unknown): input is BadRequestError {
    if (hasInstanceof(input, BAD_REQUEST_ERROR_INSTANCE)) return true;
    if (!isAuthupError(input)) return false;
    return input.code === ErrorCode.BAD_REQUEST;
}

export function isUnauthorizedError(input: unknown): input is UnauthorizedError {
    if (hasInstanceof(input, UNAUTHORIZED_ERROR_INSTANCE)) return true;
    if (!isAuthupError(input)) return false;
    return input.code === ErrorCode.IDENTITY_UNAUTHORIZED;
}

export function isEntityNotFoundError(input: unknown): input is EntityNotFoundError {
    if (hasInstanceof(input, ENTITY_NOT_FOUND_ERROR_INSTANCE)) return true;
    if (!isAuthupError(input)) return false;
    return input.code === ErrorCode.ENTITY_NOT_FOUND;
}

export function isEntityConflictError(input: unknown): input is EntityConflictError {
    if (hasInstanceof(input, ENTITY_CONFLICT_ERROR_INSTANCE)) return true;
    if (!isAuthupError(input)) return false;
    return input.code === ErrorCode.ENTITY_CONFLICT;
}

export function isInternalError(input: unknown): input is InternalError {
    if (hasInstanceof(input, INTERNAL_ERROR_INSTANCE)) return true;
    if (!isAuthupError(input)) return false;
    return input.code === ErrorCode.INTERNAL_ERROR;
}
