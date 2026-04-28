/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { OAuth2Error } from '@authup/specs';
import { useRequestBody } from '@routup/basic/body';
import { useRequestQuery } from '@routup/basic/query';
import type { Request } from 'routup';
import { getRequestHeader, getRequestIP } from 'routup';
import { OAuth2AuthorizeGrant } from '../../../../../core/index.ts';
import type {
    IOAuth2AuthorizationCodeVerifier,
    OAuth2ClientAuthenticator,
} from '../../../../../core/index.ts';
import type { HTTPOAuth2AuthorizeGrantContext, IHTTPOAuth2Grant } from './types.ts';
import { extractClientCredentialsFromRequest } from './utils/index.ts';

export class HTTPOAuth2AuthorizeGrant extends OAuth2AuthorizeGrant implements IHTTPOAuth2Grant {
    protected codeVerifier : IOAuth2AuthorizationCodeVerifier;

    protected clientAuthenticator : OAuth2ClientAuthenticator;

    constructor(ctx: HTTPOAuth2AuthorizeGrantContext) {
        super(ctx);

        this.codeVerifier = ctx.codeVerifier;
        this.clientAuthenticator = ctx.clientAuthenticator;
    }

    async runWithRequest(req: Request): Promise<OAuth2TokenGrantResponse> {
        const code = this.extractParam(req, 'code');
        const redirectUri = this.extractParam(req, 'redirect_uri');
        const codeVerifier = this.extractParam(req, 'code_verifier');
        if (!code) {
            throw OAuth2Error.requestInvalid();
        }

        const { clientId, clientSecret } = extractClientCredentialsFromRequest(req);
        const realmId = this.extractParam(req, 'realm_id');

        const client = await this.clientAuthenticator.authenticate(clientId, clientSecret, realmId);

        const entity = await this.codeVerifier.verify(code, {
            redirectUri,
            codeVerifier,
            clientId: client.id,
            clientIsPublic: !client.is_confidential,
        });

        return this.runWith(entity, {
            ipAddress: getRequestIP(req, { trustProxy: true }),
            userAgent: getRequestHeader(req, 'user-agent'),
        });
    }

    protected extractParam(req: Request, key: string) : string | undefined {
        let value : unknown = useRequestBody(req, key);
        if (!value) {
            value = useRequestQuery(req, key);
        }

        return typeof value === 'string' && value.length > 0 ?
            value :
            undefined;
    }
}
