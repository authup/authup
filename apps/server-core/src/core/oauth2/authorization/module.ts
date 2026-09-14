/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Identity,
    OAuth2AuthorizationCode,
    OAuth2AuthorizationCodeRequest,
} from '@authup/core-kit';
import {
    EventName,
    EventRefType,
    EventScope,
} from '@authup/core-kit';
import {
    OAuth2AuthorizationResponseType,
    OAuth2GrantError,
    OAuth2ResponseTypeError,
} from '@authup/specs';
import type { IOAuth2AuthorizationCodeIssuer } from './code/index.ts';
import { OAuth2AuthorizationGate } from './gate.ts';
import { classifyAuthorizeFailure } from './helpers.ts';
import type {
    IOAuth2AuthorizationGate,
    OAuth2AuthorizationManagerContext,
    OAuth2AuthorizationOptions,
    OAuth2AuthorizationResult,
} from './types.ts';
import type { IEventService } from '../../entities/index.ts';
import type { IAuthFlowMetrics } from '../../metrics/index.ts';

export class OAuth2Authorization {
    protected codeIssuer : IOAuth2AuthorizationCodeIssuer;

    protected gate : IOAuth2AuthorizationGate;

    protected eventService? : IEventService;

    protected metrics? : IAuthFlowMetrics;

    constructor(ctx: OAuth2AuthorizationManagerContext) {
        this.codeIssuer = ctx.codeIssuer;
        this.gate = new OAuth2AuthorizationGate(ctx);
        this.eventService = ctx.eventService;
        this.metrics = ctx.metrics;
    }

    /**
     * Authorize with validated codeRequest.
     *
     * @param data
     * @param identity
     * @param options
     */
    async authorize(
        data: OAuth2AuthorizationCodeRequest,
        identity: Identity,
        options: OAuth2AuthorizationOptions = {},
    ) : Promise<OAuth2AuthorizationResult> {
        try {
            const result = await this.authorizeInner(data, identity, options);

            await this.eventService?.record({
                scope: EventScope.OAUTH2,
                name: EventName.AUTHORIZE,
                refType: EventRefType.CLIENT,
                refId: options.client?.id ?? data.client_id ?? null,
                clientId: options.client?.id ?? data.client_id ?? null,
                sessionId: options.sessionId ?? null,
                actorType: identity.type,
                actorId: identity.data.id,
                actorName: identity.data.name,
                realmId: data.realm_id ?? null,
                data: {
                    reason: options.client?.builtIn ? 'autoConsent' : 'consent',
                    ...(data.scope ? { scope: data.scope } : {}),
                },
            });
            this.metrics?.recordAuthorize('issued');

            return result;
        } catch (e) {
            const outcome = classifyAuthorizeFailure(e);
            if (outcome === 'denied') {
                await this.eventService?.record({
                    scope: EventScope.OAUTH2,
                    name: EventName.AUTHORIZE_FAILED,
                    refType: EventRefType.CLIENT,
                    refId: options.client?.id ?? data.client_id ?? null,
                    clientId: options.client?.id ?? data.client_id ?? null,
                    sessionId: options.sessionId ?? null,
                    actorType: identity.type,
                    actorId: identity.data.id,
                    actorName: identity.data.name,
                    realmId: data.realm_id ?? null,
                    data: { reason: 'accessPolicy' },
                });
            }
            this.metrics?.recordAuthorize(outcome);

            throw e;
        }
    }

    protected async authorizeInner(
        data: OAuth2AuthorizationCodeRequest,
        identity: Identity,
        options: OAuth2AuthorizationOptions = {},
    ) : Promise<OAuth2AuthorizationResult> {
        // OAuth 2.1 posture: only the authorization-code response type is
        // supported — implicit/hybrid (token, id_token, none) were dropped
        // (plan 042 item 3). Defense in depth behind the request validator.
        let responseTypes : string[] = [];
        if (data.response_type) {
            responseTypes = Array.isArray(data.response_type) ?
                data.response_type :
                data.response_type.split(' ');
        }

        for (const responseType of responseTypes) {
            if (responseType !== OAuth2AuthorizationResponseType.CODE) {
                throw OAuth2ResponseTypeError.unsupported();
            }
        }

        if (!responseTypes.includes(OAuth2AuthorizationResponseType.CODE)) {
            throw OAuth2ResponseTypeError.unsupported();
        }

        if (!data.redirect_uri) {
            throw OAuth2GrantError.redirectUriMismatch();
        }

        const output : OAuth2AuthorizationResult = {
            redirectUri: data.redirect_uri,
            ...(data.state ? { state: data.state } : {}),
        };

        const { authTime, session } = await this.gate.evaluate(data, identity, options);

        // The id_token is NOT minted here — the /token exchange mints it after
        // resolving the real backing session, so its `sid` is authoritative
        // (plan 042 item 6). The code carries the authentication instant.
        const codeEntity : OAuth2AuthorizationCode = await this.codeIssuer.issue(
            data,
            identity,
            {
                sessionId: options.sessionId,
                authTime,
                authMethod: session?.authMethod ?? null,
            },
        );

        output.authorizationCode = codeEntity.id;

        return output;
    }
}
