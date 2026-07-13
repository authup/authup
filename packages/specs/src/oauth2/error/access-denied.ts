/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode, markInstanceof } from '@authup/errors';
import type { AuthupErrorOptions } from '@authup/errors';
import { OAuth2ErrorCode } from '../constants';
import { OAuth2Error, normalizeOAuth2ErrorInput } from './module.ts';

export const OAUTH2_ACCESS_DENIED_ERROR_INSTANCE = Symbol.for('@authup/specs/OAuth2AccessDeniedError');

export class OAuth2AccessDeniedError extends OAuth2Error {
    /**
     * Verified redirect target for an error redirect (RFC 6749 §4.1.2.1).
     * Non-enumerable class field — never part of the serialized error body.
     */
    declare public readonly redirectUri: string | null;

    declare public readonly state: string | null;

    constructor(input?: AuthupErrorOptions & { redirectUri?: string | null, state?: string | null }) {
        const options = normalizeOAuth2ErrorInput(input);
        super({
            code: ErrorCode.OAUTH_ACCESS_DENIED,
            message: 'Access to the requested application is not permitted.',
            ...options,
            data: {
                error: OAuth2ErrorCode.ACCESS_DENIED,
                ...(options.data ?? {}),
            },
        });
        markInstanceof(this, OAUTH2_ACCESS_DENIED_ERROR_INSTANCE);

        Object.defineProperty(this, 'redirectUri', { value: input?.redirectUri ?? null });
        Object.defineProperty(this, 'state', { value: input?.state ?? null });
    }

    static forClient(ctx?: { redirectUri?: string | null, state?: string | null }) {
        return new OAuth2AccessDeniedError({
            message: 'Access to the requested application is not permitted.',
            ...ctx,
        });
    }
}
