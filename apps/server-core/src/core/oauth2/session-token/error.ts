/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    ErrorCode,
    ValidationError,
    markInstanceof,
    matchesInstanceof,
} from '@authup/errors';

export const SESSION_TOKEN_RELATION_MISSING_ERROR_INSTANCE = Symbol.for('@authup/server-core/SessionTokenRelationMissingError');

/**
 * A row the token references no longer exists.
 *
 * Raised by the repository adapter when the inventory insert is rejected by a
 * foreign key. Both parents can vanish between the caller resolving them and
 * the write landing: the session (a concurrent refresh-token replay reaction,
 * an explicit logout, an admin force-logout, the session sweeper) and the
 * client the token is attributed to (an admin deleting the application).
 *
 * The error deliberately does NOT name which one. Only postgres reports the
 * failing constraint as a field; mysql buries it in the message text and sqlite
 * reports nothing but "FOREIGN KEY constraint failed", so a per-relation
 * classification would be unimplementable on the dialect the test suite runs
 * on. It also would not buy anything: both parents cascade onto
 * `auth_session_tokens`, so either one going missing has already deleted the
 * token rows, and the answer for the caller is the same.
 *
 * Transport-agnostic on purpose: the refresh grant re-raises it as
 * `invalid_grant`, every other issuing path lets it settle as the 400 its code
 * maps to.
 */
export class SessionTokenRelationMissingError extends ValidationError {
    constructor() {
        super({
            code: ErrorCode.ENTITY_RELATION_INVALID,
            message: 'A row the token references no longer exists.',
        });
        markInstanceof(this, SESSION_TOKEN_RELATION_MISSING_ERROR_INSTANCE);
    }
}

/**
 * Deliberately marker-only, with no `code` fallback: `ENTITY_RELATION_INVALID`
 * is the shared code for every invalid relation reference (`sanitizeError`
 * assigns it to typeorm-extension's join-column lookup failures too), so
 * matching on it would claim unrelated errors. The error never crosses a wire
 * boundary before it is caught, so there is nothing for a rehydrated match to
 * recover.
 */
export function isSessionTokenRelationMissingError(input: unknown): input is SessionTokenRelationMissingError {
    return matchesInstanceof(input, SESSION_TOKEN_RELATION_MISSING_ERROR_INSTANCE);
}
