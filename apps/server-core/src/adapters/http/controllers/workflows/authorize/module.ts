/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DContext,
    DController,
    DGet,
    DPost,
} from '@routup/decorators';
import { URL } from 'node:url';

import type { IAppEvent } from 'routup';
import type { Client, OAuth2AuthorizationCodeRequest, Scope } from '@authup/core-kit';
import { ForceUserLoggedInMiddleware } from '../../../middleware/index.ts';
import { HTTPOAuth2Authorizer } from '../../../adapters/index.ts';
import { renderUIPage } from '../../../ui/index.ts';
import { readFromLocations } from '../../../request/index.ts';
import type { IOAuth2AuthorizationCodeRequestVerifier } from '../../../../../core/index.ts';
import { OAuth2AuthorizationCodeRequestValidator } from '../../../../../core/index.ts';
import type { AuthorizeControllerContext, AuthorizeControllerOptions } from './types.ts';
import { sanitizeError } from '../../../../../utils/index.ts';

@DController('/authorize')
export class AuthorizeController {
    // todo: maybe /realms/<realm>/protocol/openid-connect/authorize
    // todo: maybe /realms/<realm>/[...]/authorize

    protected options: AuthorizeControllerOptions;

    protected codeRequestVerifier : IOAuth2AuthorizationCodeRequestVerifier;

    protected codeRequestValidator : OAuth2AuthorizationCodeRequestValidator;

    protected authorizer: HTTPOAuth2Authorizer;

    // ---------------------------------------------------------

    constructor(ctx: AuthorizeControllerContext) {
        this.options = ctx.options;

        this.codeRequestVerifier = ctx.codeRequestVerifier;

        this.codeRequestValidator = new OAuth2AuthorizationCodeRequestValidator();

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
    async confirm(@DContext() event: IAppEvent): Promise<{ url: string }> {
        const result = await this.authorizer.authorizeWithRequest(event);

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

        return { url: url.href };
    }

    @DGet('', [])
    async serve(@DContext() event: IAppEvent): Promise<string> {
        let codeRequest : OAuth2AuthorizationCodeRequest | undefined;

        let client : Client | undefined;
        let scopes : Scope[] | undefined;

        let error : Error | undefined;

        try {
            const merged = await readFromLocations(event, ['body', 'query']);
            const data = await this.codeRequestValidator.run(merged);

            const result = await this.codeRequestVerifier.verify(data);
            client = result.client;
            scopes = result.scopes;

            codeRequest = result.data;
        } catch (e) {
            const normalized = sanitizeError(e);
            error = {
                ...normalized,
                message: normalized.message,
            };
        }

        // Path + query of the original request — the SSR page uses it as
        // the same-origin `redirect` parameter on register / password links
        // so those pages can lead back into this authorize request.
        const requestURL = new URL(event.request.url);

        return renderUIPage(event, {
            url: '/authorize',
            payload: {
                config: { baseURL: this.options.baseURL },
                data: {
                    codeRequest,
                    error,
                    client,
                    scopes,
                    features: this.options.features,
                    requestPath: `${requestURL.pathname}${requestURL.search}`,
                },
            },
        });
    }
}
