/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IRoutupEvent } from 'routup';
import type { OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import type { IOAuth2AuthorizationCodeRequestVerifier, OAuth2AuthorizationResult } from '../../../../../core/index.ts';
import { OAuth2Authorization, OAuth2AuthorizationCodeRequestValidator } from '../../../../../core/index.ts';
import { readFromLocations, useRequestIdentityOrFail } from '../../../request/index.ts';
import type { HTTPOAuth2AuthorizationManagerContext } from './types.ts';

export class HTTPOAuth2Authorizer extends OAuth2Authorization {
    protected codeRequestVerifier : IOAuth2AuthorizationCodeRequestVerifier;

    protected requestValidator : OAuth2AuthorizationCodeRequestValidator;

    constructor(ctx: HTTPOAuth2AuthorizationManagerContext) {
        super(ctx);

        this.codeRequestVerifier = ctx.codeRequestVerifier;

        this.requestValidator = new OAuth2AuthorizationCodeRequestValidator();
    }

    async authorizeWithRequest(event: IRoutupEvent) : Promise<OAuth2AuthorizationResult> {
        const codeRequestValidated = await this.validateWithRequest(event);

        const { data } = await this.codeRequestVerifier.verify(codeRequestValidated);

        const identity = useRequestIdentityOrFail(event);

        return this.authorize(data, identity.raw);
    }

    /**
     * Validate authorization request.
     *
     * @throws OAuth2Error
     */
    async validateWithRequest(
        event: IRoutupEvent,
    ) : Promise<OAuth2AuthorizationCodeRequest> {
        const data = await readFromLocations(event, ['body', 'query']);
        return this.requestValidator.run(data);
    }
}
