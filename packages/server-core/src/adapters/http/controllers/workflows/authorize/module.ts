/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DController, DGet, DPost, DRequest, DResponse,
} from '@routup/decorators';
import { load } from 'locter';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { send, useRequestParam } from 'routup';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { type Client, OAuth2AuthorizationCodeRequest, type Scope } from '@authup/core-kit';
import { CodeTransformation, isCodeTransformation } from 'typeorm-extension';
import { resolveClientWebSlimPackagePath } from '../../../../../path.ts';
import { ForceUserLoggedInMiddleware } from '../../../middleware/index.ts';
import { HTTPOAuth2Authorizer } from '../../../adapters/index.ts';
import {
    IOAuth2AuthorizationCodeRequestVerifier,
    OAuth2AuthorizationCodeRequestValidator,
} from '../../../../../core/index.ts';
import { sanitizeError } from '../../../../../utils/index.ts';
import type { AuthorizeControllerContext, AuthorizeControllerOptions } from './types.ts';

@DController('/authorize')
export class AuthorizeController {
    // todo: maybe /realms/<realm>/protocol/openid-connect/authorize
    // todo: maybe /realms/<realm>/[...]/authorize

    protected options: AuthorizeControllerOptions;

    protected codeRequestVerifier : IOAuth2AuthorizationCodeRequestVerifier;

    protected codeRequestValidator : RoutupContainerAdapter<OAuth2AuthorizationCodeRequest>;

    protected authorizer: HTTPOAuth2Authorizer;

    // ---------------------------------------------------------

    constructor(ctx: AuthorizeControllerContext) {
        this.options = ctx.options;

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
            scopes = result.scopes;

            codeRequest = result.data;
        } catch (e) {
            const normalized = sanitizeError(e);
            error = {
                ...normalized,
                message: normalized.message,
            };
        }

        const isJIT = isCodeTransformation(CodeTransformation.JUST_IN_TIME);

        const payload = {
            config: {
                baseURL: this.options.baseURL,
            },
            data: {
                codeRequest,
                error,
                client,
                scopes,
            },
        };

        let html : string;
        let manifest : Record<string, any>;
        let render : CallableFunction;

        const clientWebSlimPackagePath = resolveClientWebSlimPackagePath();

        if (isJIT) {
            /**
             * @type {import('vite').ViteDevServer}
             */
            const vite = useRequestParam(req, 'viteServer');

            html = await fs.promises.readFile(
                path.join(clientWebSlimPackagePath, 'index.html'),
                'utf-8',
            );
            html = await vite.transformIndexHtml('/', html);
            manifest = {};
            render = (await vite.ssrLoadModule('/src/server.ts')).render;
        } else {
            html = await fs.promises.readFile(
                path.join(clientWebSlimPackagePath, 'dist', 'client', 'index.html'),
                'utf-8',
            );

            manifest = JSON.parse(await fs.promises.readFile(
                path.join(clientWebSlimPackagePath, 'dist', 'client', '.vite', 'ssr-manifest.json'),
                'utf-8',
            ));

            render = (await load(path.join(clientWebSlimPackagePath, 'dist', 'server', 'server.js'))).render;
        }

        const [appHtml, preloadLinks] = await render({
            url: '/authorize',
            manifest,
            payload,
        });

        return send(
            res,
            html
                .replace('<!--preload-links-->', preloadLinks)
                .replace('<!--app-html-->', appHtml),
        );
    }
}
