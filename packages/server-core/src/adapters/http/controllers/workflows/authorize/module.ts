/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DController, DGet, DPost, DRequest, DResponse,
} from '@routup/decorators';
import { URL } from 'node:url';
import { send } from 'routup';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { type Client, OAuth2AuthorizationCodeRequest, type Scope } from '@authup/core-kit';
import { ForceUserLoggedInMiddleware } from '../../../middleware';
import { HTTPOAuth2Authorizer } from '../../../adapters';
import {
    IOAuth2AuthorizationCodeRequestVerifier,
    OAuth2AuthorizationCodeRequestValidator,
} from '../../../../../core';
import { sanitizeError } from '../../../../../utils';
import { sendClientResponse } from '../../../response';
import type { AuthorizeControllerContext } from './types';

@DController('/authorize')
export class AuthorizeController {
    // todo: maybe /realms/<realm>/protocol/openid-connect/authorize
    // todo: maybe /realms/<realm>/[...]/authorize

    protected codeRequestVerifier : IOAuth2AuthorizationCodeRequestVerifier;

    protected codeRequestValidator : RoutupContainerAdapter<OAuth2AuthorizationCodeRequest>;

    protected authorizer: HTTPOAuth2Authorizer;

    // ---------------------------------------------------------

    constructor(ctx: AuthorizeControllerContext) {
        this.codeRequestVerifier = ctx.codeRequestVerifier;

        const validator = new OAuth2AuthorizationCodeRequestValidator();
        this.codeRequestValidator = new RoutupContainerAdapter(validator);

        this.authorizer = new HTTPOAuth2Authorizer({
            codeRequestVerifier: this.codeRequestVerifier,
            accessTokenIssuer: ctx.accessTokenIssuer,
            openIdTokenIssuer: ctx.openIdTokenIssuer,
            codeIssuer: ctx.codeIssuer,
            identityResolver: ctx.identityResolver,
        });
    }

    // ---------------------------------------------------------

    @DPost('', [ForceUserLoggedInMiddleware])
    async confirm(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<void> {
        const result = await this.authorizer.authorizeWithRequest(req);

        const url = new URL(result.redirectUri);
        if (result.state) {
            url.searchParams.set('state', result.state);
        }

        if (result.authorizationCode) {
            url.searchParams.set('code', result.authorizationCode);
        }

        if (result.accessToken) {
            url.searchParams.set('access_token', result.accessToken);
        }

        if (result.idToken) {
            url.searchParams.set('id_token', result.idToken);
        }

        return send(res, { url: url.href });
    }

    @DGet('', [])
    async serve(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<void> {
        let codeRequest : OAuth2AuthorizationCodeRequest | undefined;

        let client : Client | undefined;
        let scopes : Scope[] | undefined;

        let error : Error | undefined;

        try {
            const data = await this.codeRequestValidator.run(req, {
                locations: ['body', 'query'],
            });

            const result = await this.codeRequestVerifier.verify(data);
            client = result.client;
            scopes = result.clientScopes.map((s) => s.scope);

            codeRequest = result.data;
        } catch (e) {
            const normalized = sanitizeError(e);
            error = {
                ...normalized,
                message: normalized.message,
            };
        }

        return sendClientResponse(req, res, {
            path: '/authorize',
            data: {
                codeRequest,
                error,
                client,
                scopes,
            },
        });
    }
}
