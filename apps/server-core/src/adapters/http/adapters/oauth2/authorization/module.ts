/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IAppEvent } from 'routup';
import type { OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import type { IOAuth2AuthorizationCodeRequestVerifier, OAuth2AuthorizationResult } from '../../../../../core/index.ts';
import { OAuth2Authorization, OAuth2AuthorizationCodeRequestValidator } from '../../../../../core/index.ts';
import { readFromLocations, useRequestIdentityOrFail, useRequestSessionId } from '../../../request/index.ts';
import type { HTTPOAuth2AuthorizationManagerContext } from './types.ts';

export class HTTPOAuth2Authorizer extends OAuth2Authorization {
    protected codeRequestVerifier : IOAuth2AuthorizationCodeRequestVerifier;

    protected requestValidator : OAuth2AuthorizationCodeRequestValidator;

    constructor(ctx: HTTPOAuth2AuthorizationManagerContext) {
        super(ctx);

        this.codeRequestVerifier = ctx.codeRequestVerifier;

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

        return this.authorize(data, identity.raw, {
            sessionId: useRequestSessionId(event),
            client,
            redirectUriVerified,
        });
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
