/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { OAuth2Error } from '@authup/specs';
import { useRequestBody } from '@routup/basic/body';
import type { Request } from 'routup';
import { getRequestHeader, getRequestIP } from 'routup';
import { OAuth2RefreshTokenGrant } from '../../../../../core/index.ts';
import type {
    IOAuth2TokenVerifier,
    OAuth2ClientAuthenticator,
} from '../../../../../core/index.ts';
import type { HTTPOAuth2RefreshTokenGrantContext, IHTTPOAuth2Grant } from './types.ts';
import { extractClientCredentialsFromRequest } from './utils/index.ts';

export class HTTPOAuth2RefreshTokenGrant extends OAuth2RefreshTokenGrant implements IHTTPOAuth2Grant {
    protected clientAuthenticator : OAuth2ClientAuthenticator;

    protected refreshTokenVerifier : IOAuth2TokenVerifier;

    constructor(ctx: HTTPOAuth2RefreshTokenGrantContext) {
        super(ctx);

        this.clientAuthenticator = ctx.clientAuthenticator;
        this.refreshTokenVerifier = ctx.tokenVerifier;
    }

    async runWithRequest(req: Request): Promise<OAuth2TokenGrantResponse> {
        const refreshToken = useRequestBody(req, 'refresh_token');
        if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
            throw OAuth2Error.requestInvalid();
        }

        const { clientId, clientSecret } = extractClientCredentialsFromRequest(req);
        const realmId = useRequestBody(req, 'realm_id');

        // RFC 6749 §6: verify the refresh token first to learn its bound
        // client (if any), then enforce binding. Authenticate the requesting
        // client when credentials are present, or when the token requires
        // a client binding.
        const payload = await this.refreshTokenVerifier.verify(refreshToken);

        if (clientId) {
            const client = await this.clientAuthenticator.authenticate(
                clientId,
                clientSecret,
                typeof realmId === 'string' ? realmId : undefined,
            );

            if (payload.client_id && payload.client_id !== client.id) {
                throw OAuth2Error.grantInvalid();
            }
        } else if (payload.client_id) {
            // Token was issued to a specific client — that client MUST
            // re-authenticate (RFC 6749 §6 binding requirement).
            throw OAuth2Error.clientInvalid();
        }

        return this.runWith(payload, {
            ipAddress: getRequestIP(req, { trustProxy: true }),
            userAgent: getRequestHeader(req, 'user-agent'),
        });
    }
}
