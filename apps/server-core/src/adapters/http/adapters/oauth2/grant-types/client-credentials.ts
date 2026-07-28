/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { OAuth2ClientError, OAuth2TokenGrant  } from '@authup/specs';
import { readRequestBody } from '@routup/basic/body';
import { ClientAuthMethod } from '@authup/core-kit';
import type { IAppEvent } from 'routup';
import { getRequestHeader, getRequestIP } from 'routup';
import type { OAuth2ClientAuthenticator } from '../../../../../core/index.ts';
import { ClientCredentialsGrant, assertClientGrantAllowed } from '../../../../../core/index.ts';
import type { HTTPOAuth2ClientCredentialsGrantContext, IHTTPOAuth2Grant } from './types.ts';
import type { CertificateSource } from '../../../request/index.ts';
import {
    extractClientCredentialsFromRequest,
    extractOAuth2ClientCertificateEvidence,
} from './utils/index.ts';

export class HTTPClientCredentialsGrant extends ClientCredentialsGrant implements IHTTPOAuth2Grant {
    protected clientAuthenticator : OAuth2ClientAuthenticator;

    protected certificateSource: CertificateSource;

    constructor(ctx: HTTPOAuth2ClientCredentialsGrantContext) {
        super(ctx);

        this.clientAuthenticator = ctx.clientAuthenticator;
        this.certificateSource = ctx.certificateSource ?? 'disabled';
    }

    async runWithRequest(event: IAppEvent): Promise<OAuth2TokenGrantResponse> {
        const { clientId, clientSecret } = await extractClientCredentialsFromRequest(event);
        const body = await readRequestBody(event);
        const realmId = body?.realm_id;

        if (!clientId) {
            throw OAuth2ClientError.invalid();
        }

        const certificateEvidence = await extractOAuth2ClientCertificateEvidence(event, this.certificateSource);
        const client = await this.clientAuthenticator.authenticate(
            clientId,
            clientSecret,
            realmId,
            certificateEvidence,
        );
        if (client.authMethod === ClientAuthMethod.NONE) {
            throw OAuth2ClientError.invalid();
        }
        const confirmation = this.clientAuthenticator.resolveTokenBinding(client, certificateEvidence);

        assertClientGrantAllowed(client, OAuth2TokenGrant.CLIENT_CREDENTIALS);

        return this.runWith(client, {
            confirmation,
            ipAddress: getRequestIP(event) ?? undefined,
            userAgent: getRequestHeader(event, 'user-agent') ?? undefined,
        });
    }
}
