/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Request } from 'routup';
import type { OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import type { IOAuth2AuthorizationCodeRequestVerifier, OAuth2AuthorizationResult } from '../../../../../core/index.ts';
import { OAuth2Authorization, OAuth2AuthorizationCodeRequestValidator } from '../../../../../core/index.ts';
import { useRequestIdentityOrFail } from '../../../request/index.ts';
import type { HTTPOAuth2AuthorizationManagerContext } from './types.ts';

export class HTTPOAuth2Authorizer extends OAuth2Authorization {
    protected codeRequestVerifier : IOAuth2AuthorizationCodeRequestVerifier;

    protected requestValidator : RoutupContainerAdapter<OAuth2AuthorizationCodeRequest>;

    constructor(ctx: HTTPOAuth2AuthorizationManagerContext) {
        super(ctx);

        this.codeRequestVerifier = ctx.codeRequestVerifier;

        const validator = new OAuth2AuthorizationCodeRequestValidator();
        this.requestValidator = new RoutupContainerAdapter(validator);
    }

    async authorizeWithRequest(req: Request) : Promise<OAuth2AuthorizationResult> {
        const codeRequestValidated = await this.validateWithRequest(req);

        const { data } = await this.codeRequestVerifier.verify(codeRequestValidated);

        const identity = useRequestIdentityOrFail(req);

        return this.authorize(data, identity.raw);
    }

    /**
     * Validate authorization request.
     *
     * @throws OAuth2Error
     *
     * @param req
     */
    async validateWithRequest(
        req: Request,
    ) : Promise<OAuth2AuthorizationCodeRequest> {
        return this.requestValidator.run(req, {
            locations: ['body', 'query'],
        });
    }
}
