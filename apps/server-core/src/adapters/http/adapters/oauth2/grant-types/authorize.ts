/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { isClientPublic } from '@authup/core-kit';
import { OAuth2RequestError, OAuth2TokenGrant } from '@authup/specs';
import { readRequestBody } from '@routup/basic/body';
import { useRequestQuery } from '@routup/basic/query';
import type { IAppEvent } from 'routup';
import { getRequestHeader, getRequestIP } from 'routup';
import { OAuth2AuthorizeGrant, assertClientGrantAllowed } from '../../../../../core/index.ts';
import type {
    IAuthFlowMetrics,
    IEventService,
    IOAuth2AccessPolicyEvaluator,
    IOAuth2AuthorizationCodeVerifier,
    IRealmRepository,
    OAuth2ClientAuthenticator,
} from '../../../../../core/index.ts';
import type { HTTPOAuth2AuthorizeGrantContext, IHTTPOAuth2Grant } from './types.ts';
import type { CertificateSource } from '../../../request/index.ts';
import {
    assertAccessPolicyBackstop,
    extractClientCredentialsFromRequest,
    extractOAuth2ClientCertificateEvidence,
    readRealmHint,
} from './utils/index.ts';

export class HTTPOAuth2AuthorizeGrant extends OAuth2AuthorizeGrant implements IHTTPOAuth2Grant {
    protected codeVerifier : IOAuth2AuthorizationCodeVerifier;

    protected clientAuthenticator : OAuth2ClientAuthenticator;

    protected realmRepository : IRealmRepository;

    protected accessPolicyEvaluator? : IOAuth2AccessPolicyEvaluator;

    protected eventService? : IEventService;

    protected metrics? : IAuthFlowMetrics;

    protected certificateSource: CertificateSource;

    constructor(ctx: HTTPOAuth2AuthorizeGrantContext) {
        super(ctx);

        this.codeVerifier = ctx.codeVerifier;
        this.clientAuthenticator = ctx.clientAuthenticator;
        this.realmRepository = ctx.realmRepository;
        this.accessPolicyEvaluator = ctx.accessPolicyEvaluator;
        this.eventService = ctx.eventService;
        this.metrics = ctx.metrics;
        this.certificateSource = ctx.certificateSource ?? 'disabled';
    }

    async runWithRequest(event: IAppEvent): Promise<OAuth2TokenGrantResponse> {
        const body = await readRequestBody(event);
        const query = useRequestQuery(event);

        const code = this.pickStringParam(body, query, 'code');
        const redirectUri = this.pickStringParam(body, query, 'redirect_uri');
        const codeVerifier = this.pickStringParam(body, query, 'code_verifier');
        if (!code) {
            throw OAuth2RequestError.malformed();
        }

        const { clientId, clientSecret } = await extractClientCredentialsFromRequest(event);
        const realm = await this.realmRepository.resolve(readRealmHint(body, query), true);
        const certificateEvidence = await extractOAuth2ClientCertificateEvidence(event, this.certificateSource);

        const client = await this.clientAuthenticator.authenticate(
            clientId,
            clientSecret,
            realm.id,
            certificateEvidence,
        );
        const confirmation = this.clientAuthenticator.resolveTokenBinding(client, certificateEvidence);

        assertClientGrantAllowed(client, OAuth2TokenGrant.AUTHORIZATION_CODE);

        const entity = await this.codeVerifier.verify(code, {
            redirectUri,
            codeVerifier,
            clientId: client.id,
            clientIsPublic: isClientPublic(client),
            realmId: client.realmId,
        });

        // Application access policy (plan 052), /token backstop: a code
        // minted before the policy was attached (or outside authorize())
        // must not redeem.
        await assertAccessPolicyBackstop({
            client,
            grantType: OAuth2TokenGrant.AUTHORIZATION_CODE,
            subject: {
                type: entity.sub_kind,
                id: entity.sub,
                realmId: entity.realm_id ?? null,
                realmName: entity.realm_name ?? null,
                clientId: entity.client_id ?? null,
            },
            sessionId: entity.session_id ?? null,
            request: {
                ipAddress: getRequestIP(event),
                userAgent: getRequestHeader(event, 'user-agent'),
            },
            evaluator: this.accessPolicyEvaluator,
            eventService: this.eventService,
            metrics: this.metrics,
        });

        return this.runWith(entity, {
            confirmation,
            ipAddress: getRequestIP(event) ?? undefined,
            userAgent: getRequestHeader(event, 'user-agent') ?? undefined,
        });
    }

    protected pickStringParam(
        body: Record<string, any> | undefined,
        query: Record<string, any> | undefined,
        key: string,
    ): string | undefined {
        const value = body?.[key] ?? query?.[key];
        return typeof value === 'string' && value.length > 0 ? value : undefined;
    }
}
