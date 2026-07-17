/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IAppEvent } from 'routup';
import type { Logger } from '@authup/server-kit';
import type { OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import type { IConsentService, IOAuth2AuthorizationCodeRequestVerifier, OAuth2AuthorizationResult } from '../../../../../core/index.ts';
import { OAuth2Authorization, OAuth2AuthorizationCodeRequestValidator } from '../../../../../core/index.ts';
import { readFromLocations, useRequestIdentityOrFail, useRequestSessionId } from '../../../request/index.ts';
import type { HTTPOAuth2AuthorizationManagerContext } from './types.ts';

export class HTTPOAuth2Authorizer extends OAuth2Authorization {
    protected codeRequestVerifier : IOAuth2AuthorizationCodeRequestVerifier;

    protected requestValidator : OAuth2AuthorizationCodeRequestValidator;

    protected consentService? : IConsentService;

    protected logger? : Logger;

    constructor(ctx: HTTPOAuth2AuthorizationManagerContext) {
        super(ctx);

        this.codeRequestVerifier = ctx.codeRequestVerifier;
        this.consentService = ctx.consentService;
        this.logger = ctx.logger;

        this.requestValidator = new OAuth2AuthorizationCodeRequestValidator();
    }

    async authorizeWithRequest(event: IAppEvent) : Promise<OAuth2AuthorizationResult> {
        const codeRequestValidated = await this.validateWithRequest(event);

        const {
            data,
            client,
            redirectUriVerified,
        } = await this.codeRequestVerifier.verify(codeRequestValidated);

        const identity = useRequestIdentityOrFail(event);

        const result = await this.authorize(data, identity.raw, {
            sessionId: useRequestSessionId(event),
            client,
            redirectUriVerified,
        });

        // Persisted per-scope consent (plan 055): recorded only after a
        // successful approval — an access-policy denial throws inside
        // authorize() above, so a denied identity never writes a row.
        // built_in clients keep zero rows (locked); insert-missing makes
        // re-recording idempotent (union/keep).
        if (this.consentService && client && !client.builtIn) {
            try {
                await this.consentService.record({
                    clientId: client.id,
                    realmId: client.realmId,
                    owner: {
                        sub: identity.raw.data.id,
                        subKind: identity.raw.type,
                    },
                    scope: data.scope ?? null,
                });
            } catch (e) {
                // never fail an issued code over a consent-write failure
                this.logger?.warn('Recording the OAuth2 consent grant failed.', {
                    clientId: client.id,
                    error: e,
                });
            }
        }

        return result;
    }

    /**
     * Validate authorization request.
     *
     * @throws OAuth2Error
     */
    async validateWithRequest(
        event: IAppEvent,
    ) : Promise<OAuth2AuthorizationCodeRequest> {
        const data = await readFromLocations(event, ['body', 'query']);
        return this.requestValidator.run(data);
    }
}
