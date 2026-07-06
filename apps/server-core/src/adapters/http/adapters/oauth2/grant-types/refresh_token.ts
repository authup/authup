/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { OAuth2ClientError, OAuth2GrantError, OAuth2RequestError } from '@authup/specs';
import { readRequestBody } from '@routup/basic/body';
import type { IAppEvent } from 'routup';
import { getRequestHeader, getRequestIP } from 'routup';
import { OAuth2RefreshTokenGrant } from '../../../../../core/index.ts';
import type {
    IOAuth2TokenVerifier,
    IRealmRepository,
    OAuth2ClientAuthenticator,
} from '../../../../../core/index.ts';
import type { HTTPOAuth2RefreshTokenGrantContext, IHTTPOAuth2Grant } from './types.ts';
import { extractClientCredentialsFromRequest, readRealmHint } from './utils/index.ts';

export class HTTPOAuth2RefreshTokenGrant extends OAuth2RefreshTokenGrant implements IHTTPOAuth2Grant {
    protected clientAuthenticator : OAuth2ClientAuthenticator;

    protected refreshTokenVerifier : IOAuth2TokenVerifier;

    protected realmRepository : IRealmRepository;

    constructor(ctx: HTTPOAuth2RefreshTokenGrantContext) {
        super(ctx);

        this.clientAuthenticator = ctx.clientAuthenticator;
        this.refreshTokenVerifier = ctx.tokenVerifier;
        this.realmRepository = ctx.realmRepository;
    }

    async runWithRequest(event: IAppEvent): Promise<OAuth2TokenGrantResponse> {
        const body = await readRequestBody(event);
        const refreshToken = body?.refresh_token;
        if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
            throw OAuth2RequestError.malformed();
        }

        const { clientId, clientSecret } = await extractClientCredentialsFromRequest(event);

        // RFC 6749 §6: verify the refresh token first to learn its bound
        // client (if any), then enforce binding. Authenticate the requesting
        // client when credentials are present, or when the token requires
        // a client binding.
        //
        // skipActiveCheck: the durable auth_session_tokens row (not the cache
        // blocklist) is the refresh-token authority, so a replayed/consumed
        // token must reach runWith() to trigger family revocation instead of
        // being rejected here with JWT_INACTIVE.
        const payload = await this.refreshTokenVerifier.verify(refreshToken, { skipActiveCheck: true });

        if (clientId) {
            // resolved lazily — a bare refresh (no client auth) skips the SELECT
            const realm = await this.realmRepository.resolve(readRealmHint(body), true);

            const client = await this.clientAuthenticator.authenticate(
                clientId,
                clientSecret,
                realm.id,
            );

            if (payload.client_id && payload.client_id !== client.id) {
                throw OAuth2GrantError.invalid();
            }
        } else if (payload.client_id) {
            // Token was issued to a specific client — that client MUST
            // re-authenticate (RFC 6749 §6 binding requirement).
            throw OAuth2ClientError.invalid();
        }

        return this.runWith(payload, {
            ipAddress: getRequestIP(event, { trustProxy: true }) ?? undefined,
            userAgent: getRequestHeader(event, 'user-agent') ?? undefined,
        });
    }
}
