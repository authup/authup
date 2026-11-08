/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ClientAuthMethod } from '@authup/core-kit';
import type { Client } from '@authup/core-kit';
import type { OAuth2SubKind, OAuth2TokenGrantResponse } from '@authup/specs';
import {
    OAuth2ClientError,
    OAuth2RequestError,
    OAuth2TokenGrant,
    OAuth2TokenTypeIdentifier,
} from '@authup/specs';
import { readRequestBody } from '@routup/basic/body';
import { useRequestQuery } from '@routup/basic/query';
import type { IAppEvent } from 'routup';
import { getRequestHeader, getRequestIP } from 'routup';
import {
    OAuth2TokenExchangeGrant,
    assertClientGrantAllowed,
    parseOAuth2Capabilities,
} from '../../../../../core/index.ts';
import type {
    IAuthFlowMetrics,
    IOAuth2AccessPolicyEvaluator,
    IRealmRepository,
    OAuth2ClientAuthenticator,
    OAuth2TokenExchangeInput,
} from '../../../../../core/index.ts';
import type { CertificateSource } from '../../../request/index.ts';
import type { HTTPOAuth2TokenExchangeGrantContext, IHTTPOAuth2Grant } from './types.ts';
import {
    assertAccessPolicyBackstop,
    extractClientCredentialsFromRequest,
    extractOAuth2ClientCertificateEvidence,
    readRealmHint,
    readStringField,
} from './utils/index.ts';

/**
 * Refused rather than read from the query string: a bearer in a url lands in
 * access logs.
 */
const QUERY_REFUSED_PARAMETERS = [
    'grant_type',
    'subject_token',
    'subject_token_type',
    'audience',
    'cap',
    'requested_token_type',
    'expires_in',
    'scope',
    'resource',
    'actor_token',
    'actor_token_type',
    'realm_id',
    'realm_name',
];

const UNSUPPORTED_PARAMETERS = ['scope', 'resource', 'actor_token', 'actor_token_type'];

function readRequiredField(body: Record<string, any> | undefined, key: string) : string {
    if (Array.isArray(body?.[key])) {
        throw OAuth2RequestError.malformed(`${key} must be given once.`);
    }

    const value = readStringField(body, key);

    if (!value) {
        throw OAuth2RequestError.malformed(`${key} is required.`);
    }

    return value;
}

function readExpiresIn(body: Record<string, any> | undefined) : number | undefined {
    const value = body?.expires_in;

    if (typeof value === 'undefined') {
        return undefined;
    }

    const parsed = typeof value === 'string' && /^[1-9]\d*$/.test(value) ?
        Number(value) :
        value;

    if (typeof parsed !== 'number' || !Number.isSafeInteger(parsed) || parsed <= 0) {
        throw OAuth2RequestError.malformed('expires_in must be a positive integer.');
    }

    return parsed;
}

function readParameters(
    client: Client,
    body: Record<string, any> | undefined,
    query: Record<string, any> | undefined,
) : OAuth2TokenExchangeInput {
    const queryParameter = QUERY_REFUSED_PARAMETERS.find((key) => typeof query?.[key] !== 'undefined');

    if (queryParameter) {
        throw OAuth2RequestError.malformed('Token exchange parameters must be sent in the request body.');
    }

    const unsupported = UNSUPPORTED_PARAMETERS.find((key) => typeof body?.[key] !== 'undefined');

    if (unsupported) {
        throw OAuth2RequestError.malformed(`${unsupported} is not supported.`);
    }

    const subjectToken = readRequiredField(body, 'subject_token');

    if (readRequiredField(body, 'subject_token_type') !== OAuth2TokenTypeIdentifier.ACCESS_TOKEN) {
        throw OAuth2RequestError.malformed(`subject_token_type must be ${OAuth2TokenTypeIdentifier.ACCESS_TOKEN}.`);
    }

    if (
        typeof body?.requested_token_type !== 'undefined' &&
        body.requested_token_type !== OAuth2TokenTypeIdentifier.JWT
    ) {
        throw OAuth2RequestError.malformed(`requested_token_type must be ${OAuth2TokenTypeIdentifier.JWT}.`);
    }

    return {
        client,
        subjectToken,
        audience: readRequiredField(body, 'audience'),
        capabilities: parseOAuth2Capabilities(readRequiredField(body, 'cap')),
        expiresIn: readExpiresIn(body),
    };
}

export class HTTPOAuth2TokenExchangeGrant extends OAuth2TokenExchangeGrant implements IHTTPOAuth2Grant {
    protected clientAuthenticator : OAuth2ClientAuthenticator;

    protected realmRepository : IRealmRepository;

    protected accessPolicyEvaluator? : IOAuth2AccessPolicyEvaluator;

    protected metrics? : IAuthFlowMetrics;

    protected certificateSource : CertificateSource;

    constructor(ctx: HTTPOAuth2TokenExchangeGrantContext) {
        super(ctx);

        this.clientAuthenticator = ctx.clientAuthenticator;
        this.realmRepository = ctx.realmRepository;
        this.accessPolicyEvaluator = ctx.accessPolicyEvaluator;
        this.metrics = ctx.metrics;
        this.certificateSource = ctx.certificateSource ?? 'disabled';
    }

    async runWithRequest(event: IAppEvent) : Promise<OAuth2TokenGrantResponse> {
        const body = await readRequestBody(event);

        const client = await this.authenticateClient(event, body);

        assertClientGrantAllowed(client, OAuth2TokenGrant.TOKEN_EXCHANGE);

        const input = readParameters(client, body, useRequestQuery(event));
        const decision = await this.authorize(input);

        const ipAddress = getRequestIP(event) ?? undefined;
        const userAgent = getRequestHeader(event, 'user-agent') ?? undefined;

        const { subject } = decision;

        await assertAccessPolicyBackstop({
            client,
            grantType: OAuth2TokenGrant.TOKEN_EXCHANGE,
            subject: {
                type: subject.sub_kind as `${OAuth2SubKind}`,
                id: subject.sub,
                realmId: subject.realm_id,
                realmName: subject.realm_name,
                clientId: client.id,
            },
            sessionId: subject.session_id,
            request: { ipAddress, userAgent },
            evaluator: this.accessPolicyEvaluator,
            eventService: this.eventService,
            metrics: this.metrics,
        });

        return this.issue(decision, { ipAddress, userAgent });
    }

    protected async authenticateClient(event: IAppEvent, body: Record<string, any> | undefined) : Promise<Client> {
        const { clientId, clientSecret } = await extractClientCredentialsFromRequest(event);

        if (!clientId) {
            throw OAuth2ClientError.invalid();
        }

        const realm = await this.realmRepository.resolve(readRealmHint(body), true);
        const certificateEvidence = await extractOAuth2ClientCertificateEvidence(event, this.certificateSource);

        const client = await this.clientAuthenticator.authenticate(
            clientId,
            clientSecret,
            realm.id,
            certificateEvidence,
        );

        if (client.authMethod === ClientAuthMethod.NONE) {
            throw OAuth2ClientError.invalid();
        }

        return client;
    }
}
