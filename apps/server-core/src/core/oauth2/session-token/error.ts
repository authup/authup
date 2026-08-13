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

export const SESSION_TOKEN_SESSION_MISSING_ERROR_INSTANCE = Symbol.for('@authup/server-core/SessionTokenSessionMissingError');

/**
 * The session a token row references no longer exists.
 *
 * Raised by the repository adapter when the inventory insert is rejected by the
 * session foreign key, which happens when the session is deleted between the
 * caller resolving it and the token being issued (a concurrent refresh-token
 * replay reaction, an explicit logout, an admin force-logout, the session
 * sweeper). Transport-agnostic on purpose: the refresh grant re-raises it as
 * `invalid_grant`, every other issuing path lets it settle as the 400 its code
 * maps to.
 */
export class SessionTokenSessionMissingError extends ValidationError {
    constructor() {
        super({
            code: ErrorCode.ENTITY_RELATION_INVALID,
            message: 'The session the token belongs to no longer exists.',
        });
        markInstanceof(this, SESSION_TOKEN_SESSION_MISSING_ERROR_INSTANCE);
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
export function isSessionTokenSessionMissingError(input: unknown): input is SessionTokenSessionMissingError {
    return matchesInstanceof(input, SESSION_TOKEN_SESSION_MISSING_ERROR_INSTANCE);
}
