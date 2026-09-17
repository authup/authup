/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizationCode } from '@authup/core-kit';
import type { OAuth2TokenGrantResponse } from '@authup/specs';
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
    IOAuth2DeviceCodeVerifier,
    IRealmRepository,
    OAuth2ClientAuthenticator,
    OAuth2DeviceCodeApproved,
} from '../../../../../core/index.ts';
import type { HTTPOAuth2DeviceCodeGrantContext, IHTTPOAuth2Grant } from './types.ts';
import type { CertificateSource } from '../../../request/index.ts';
import {
    assertAccessPolicyBackstop,
    extractClientCredentialsFromRequest,
    extractOAuth2ClientCertificateEvidence,
    readRealmHint,
    readStringField,
} from './utils/index.ts';

export function toAuthorizationCode(entity: OAuth2DeviceCodeApproved) : OAuth2AuthorizationCode {
    return {
        id: entity.id,
        client_id: entity.client_id,
        scope: entity.scope,
        realm_id: entity.realm_id,
        realm_name: entity.realm_name,
        sub: entity.decision.sub,
        sub_kind: entity.decision.sub_kind,
        session_id: entity.decision.session_id,
        auth_time: entity.decision.auth_time,
        auth_method: entity.decision.auth_method,
        nonce: null,
        redirect_uri: null,
        code_challenge: null,
        code_challenge_method: null,
        acr_values: null,
    };
}

export class HTTPOAuth2DeviceCodeGrant extends OAuth2AuthorizeGrant implements IHTTPOAuth2Grant {
    protected deviceCodeVerifier : IOAuth2DeviceCodeVerifier;

    protected clientAuthenticator : OAuth2ClientAuthenticator;

    protected realmRepository : IRealmRepository;

    protected accessPolicyEvaluator? : IOAuth2AccessPolicyEvaluator;

    protected eventService? : IEventService;

    protected metrics? : IAuthFlowMetrics;

    protected certificateSource: CertificateSource;

    constructor(ctx: HTTPOAuth2DeviceCodeGrantContext) {
        super(ctx);

        this.deviceCodeVerifier = ctx.deviceCodeVerifier;
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

        const deviceCode = readStringField(body, 'device_code') ?? readStringField(query, 'device_code');
        if (!deviceCode) {
            throw OAuth2RequestError.malformed('device_code is required.');
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

        assertClientGrantAllowed(client, OAuth2TokenGrant.DEVICE_CODE);

        const entity = await this.deviceCodeVerifier.verify(deviceCode, {
            clientId: client.id,
            realmId: client.realmId,
        });

        await assertAccessPolicyBackstop({
            client,
            grantType: OAuth2TokenGrant.DEVICE_CODE,
            subject: {
                type: entity.decision.sub_kind,
                id: entity.decision.sub,
                realmId: entity.realm_id,
                realmName: entity.realm_name,
                clientId: entity.client_id,
            },
            sessionId: entity.decision.session_id ?? null,
            request: {
                ipAddress: getRequestIP(event),
                userAgent: getRequestHeader(event, 'user-agent'),
            },
            evaluator: this.accessPolicyEvaluator,
            eventService: this.eventService,
            metrics: this.metrics,
        });

        return this.runWith(toAuthorizationCode(entity), {
            confirmation,
            ipAddress: getRequestIP(event) ?? undefined,
            userAgent: getRequestHeader(event, 'user-agent') ?? undefined,
        });
    }
}
