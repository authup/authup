/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from './constants.ts';

/**
 * Default mapping from `ErrorCode` to HTTP status. Adapters apply this and
 * may layer their own overrides on top. Codes not listed here fall back
 * to 400 (Bad Request) — which is the right default for "validation /
 * malformed-request" style errors.
 *
 * The mapping mirrors the HTTP statuses produced by the pre-refactor
 * `@ebec/http`-coupled error classes, with one intentional change:
 *
 * - `OAUTH_CLIENT_INVALID`: 400 → **401**, per RFC 6749 §5.2 (`invalid_client`
 *   responses should use 401). Surfaces as a behavior change in HTTP-level
 *   tests asserting `status: 400, code: OAUTH_CLIENT_INVALID`.
 */
export const ERROR_CODE_TO_STATUS: Readonly<Partial<Record<`${ErrorCode}`, number>>> = {
    // 401
    [ErrorCode.OAUTH_CLIENT_INVALID]: 401,
    [ErrorCode.HTTP_BEARER_TOKEN_MALFORMED]: 401,
    [ErrorCode.HTTP_HEADER_AUTH_TYPE_UNSUPPORTED]: 401,
    [ErrorCode.IDENTITY_UNAUTHORIZED]: 401,

    // 403
    [ErrorCode.PERMISSION_NOT_FOUND]: 403,
    [ErrorCode.PERMISSION_DENIED]: 403,
    [ErrorCode.PERMISSION_EVALUATION_FAILED]: 403,

    // 404
    [ErrorCode.ENTITY_NOT_FOUND]: 404,
    [ErrorCode.JWK_NOT_FOUND]: 404,

    // 409
    [ErrorCode.ENTITY_CONFLICT]: 409,

    // 500
    [ErrorCode.INTERNAL_ERROR]: 500,

    // 507
    [ErrorCode.STORAGE_INSUFFICIENT]: 507,
};

/**
 * Resolve an HTTP status for a given error code. Unknown codes fall back
 * to `fallback` (default 400).
 */
export function httpStatusFromCode(code: string, fallback = 400): number {
    return ERROR_CODE_TO_STATUS[code as `${ErrorCode}`] ?? fallback;
}
