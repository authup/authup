/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DPut, DRequest, DResponse, DTags,
} from '@routup/decorators';
import {
    type Request, getRequestHeader, getRequestHostName, getRequestIP, sendRedirect,
} from 'routup';
import {
    IdentityProvider,
    IdentityType,
    type OAuth2AuthorizationCodeRequest,
    isOAuth2IdentityProvider,
    isOpenIDIdentityProvider,
} from '@authup/core-kit';
import { useDataSource } from 'typeorm-extension';
import { BadRequestError, NotFoundError } from '@ebec/http';
import type { AuthorizeParameters } from '@hapic/oauth2';
import { useRequestQuery } from '@routup/basic/query';
import { OAuth2Error } from '@authup/specs';
import { base64URLDecode } from '@authup/kit';
import { URL } from 'node:url';
import { setResponseCookie } from '@routup/basic/cookie';
import { CookieName } from '@authup/core-http-kit';
import { DataSource } from 'typeorm';
import {
    type IIdentityProviderAccountManager,
    IOAuth2AuthorizationCodeRequestVerifier,
    IOAuth2AuthorizationStateManager,
    IdentityGrantType,
    OAuth2AuthorizationCodeRequestValidator,
    OAuth2AuthorizationState, createIdentityProviderOAuth2Authenticator,
} from '../../../../../core';
import { useRequestParamID } from '../../../request';
import { ForceLoggedInMiddleware } from '../../../middleware';
import {
    deleteIdentityProviderRouteHandler,
    getManyIdentityProviderRouteHandler,
    getOneIdentityProviderRouteHandler,
    writeIdentityProviderRouteHandler,
} from './handlers';
import { useConfig } from '../../../../../config';
import { IdentityProviderRepository } from '../../../../database/domains';
import { IdentityProviderControllerContext, IdentityProviderControllerOptions } from './types';

@DTags('identity')
@DController('/identity-providers')
export class IdentityProviderController {
    protected options: IdentityProviderControllerOptions;

    protected accountManager: IIdentityProviderAccountManager;

    protected codeRequestVerifier : IOAuth2AuthorizationCodeRequestVerifier;

    protected codeRequestValidator : OAuth2AuthorizationCodeRequestValidator;

    protected stateManager : IOAuth2AuthorizationStateManager;

    protected identityGrant : IdentityGrantType;

    // ---------------------------------------------------------

    constructor(ctx: IdentityProviderControllerContext) {
        this.options = ctx.options;
        this.accountManager = ctx.accountManager;
        this.codeRequestVerifier = ctx.codeRequestVerifier;
        this.codeRequestValidator = new OAuth2AuthorizationCodeRequestValidator();
        this.stateManager = ctx.stateManager;

        this.identityGrant = new IdentityGrantType({
            accessTokenIssuer: ctx.accessTokenIssuer,
            refreshTokenIssuer: ctx.refreshTokenIssuer,
        });
    }

    // ---------------------------------------------------------

    @DGet('', [])
    async getProviders(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<IdentityProvider[]> {
        return getManyIdentityProviderRouteHandler(req, res);
    }

    @DGet('/:id', [])
    async getProvider(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<IdentityProvider> {
        return getOneIdentityProviderRouteHandler(req, res);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async editProvider(
        @DPath('id') id: string,
            @DBody() user: NonNullable<IdentityProvider>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<IdentityProvider> {
        return writeIdentityProviderRouteHandler(req, res, {
            updateOnly: true,
        });
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
            @DBody() user: NonNullable<IdentityProvider>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<IdentityProvider> {
        return writeIdentityProviderRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async dropProvider(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<IdentityProvider> {
        return deleteIdentityProviderRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async addProvider(
        @DBody() user: NonNullable<IdentityProvider>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<IdentityProvider> {
        return writeIdentityProviderRouteHandler(req, res);
    }

    // ---------------------------------------------------------

    @DGet('/:id/authorize-out', [])
    async authorizeOut(
    @DPath('id') _id: string,
        @DRequest() req: any,
        @DResponse() res: any,
    ) {
        const id = useRequestParamID(req);
        const dataSource = await useDataSource();
        const entity = await this.resolve(dataSource, id);

        if (!isOAuth2IdentityProvider(entity) && !isOpenIDIdentityProvider(entity)) {
            throw new BadRequestError('Only an identity-provider based on the oauth protocol supports authorize redirect.');
        }

        const authenticator = createIdentityProviderOAuth2Authenticator({
            accountManager: this.accountManager,
            provider: entity,
            baseURL: this.options.baseURL,
        });

        const parameters : AuthorizeParameters = {};

        let codeRequest: OAuth2AuthorizationCodeRequest | undefined;
        const query = useRequestQuery(req);
        if (typeof query.codeRequest === 'string') {
            let codeRequestDecoded: OAuth2AuthorizationCodeRequest;

            try {
                codeRequestDecoded = JSON.parse(base64URLDecode(query.codeRequest));
            } catch (e) {
                throw OAuth2Error.requestInvalid('The code request is malformed and can not be parsed.');
            }

            const codeRequestValidated = await this.codeRequestValidator.run(codeRequestDecoded);
            const data = await this.codeRequestVerifier.verify(codeRequestValidated);

            if (
                data.client.realm_id &&
                entity.realm_id &&
                entity.realm_id !== data.client.realm_id
            ) {
                throw OAuth2Error.requestInvalid('The provider and client realm do not match.');
            }

            codeRequest = data.data;
        }

        parameters.state = await this.saveAuthorizationState(req, codeRequest);

        return sendRedirect(res, authenticator.buildRedirectURL(parameters));
    }

    @DGet('/:id/authorize-in', [])
    async authorizeIn(
    @DPath('id') _id: string,
        @DRequest() req: any,
        @DResponse() res: any,
    ) {
        const id = useRequestParamID(req);
        const dataSource = await useDataSource();

        const entity = await this.resolve(dataSource, id);

        if (!isOAuth2IdentityProvider(entity) && !isOpenIDIdentityProvider(entity)) {
            throw new Error(`The provider protocol ${entity.protocol} is not valid.`);
        }

        const data = await this.verifyAuthorizationState(req);
        if (
            entity.realm_id &&
            data.codeRequest &&
            data.codeRequest.realm_id &&
            data.codeRequest.realm_id !== entity.realm_id
        ) {
            throw OAuth2Error.requestInvalid('The provider and client realm do not match.');
        }

        const { code } = useRequestQuery(req);

        const authenticator = createIdentityProviderOAuth2Authenticator({
            accountManager: this.accountManager,
            provider: entity,
            baseURL: this.options.baseURL,
        });

        // todo: identity should respect client_id
        const user = await authenticator.authenticate(code);

        const config = useConfig();

        const token = await this.identityGrant.runWith({
            type: IdentityType.USER,
            data: {
                ...user,
                realm: entity.realm,
            },
        });

        const cookieDomainsRaw : string[] = [
            new URL(config.publicUrl).hostname,
        ];

        if (config.cookieDomain) {
            cookieDomainsRaw.push(config.cookieDomain);
        }

        if (config.authorizeRedirectUrl) {
            cookieDomainsRaw.push(new URL(config.authorizeRedirectUrl).hostname);
        }

        cookieDomainsRaw.push(getRequestHostName(req, {
            trustProxy: true,
        }));

        const cookieDomains = [...new Set(cookieDomainsRaw)];

        for (let i = 0; i < cookieDomains.length; i++) {
            setResponseCookie(
                res,
                CookieName.ACCESS_TOKEN,
                token.access_token,
                {
                    domain: cookieDomains[i],
                    maxAge: config.tokenAccessMaxAge * 1000,
                },
            );

            setResponseCookie(
                res,
                CookieName.REFRESH_TOKEN,
                token.refresh_token,
                {
                    domain: cookieDomains[i],
                    maxAge: config.tokenRefreshMaxAge * 1000,
                },
            );
        }

        if (data.codeRequest) {
            const codeRequestKeys = Object.keys(data.codeRequest);

            const url = new URL('/authorize', config.publicUrl);
            for (let i = 0; i < codeRequestKeys.length; i++) {
                url.searchParams.set(codeRequestKeys[i], data.codeRequest[codeRequestKeys[i]]);
            }

            return sendRedirect(res, url.href);
        }

        return sendRedirect(res, config.authorizeRedirectUrl || config.publicUrl);
    }

    // ---------------------------------------------------------

    private async resolve(dataSource: DataSource, id: string) {
        const repository = new IdentityProviderRepository(dataSource);
        const entity = await repository.findOneWithEA({
            relations: {
                realm: true,
            },
            where: {
                id,
            },
        });

        if (!entity) {
            throw new NotFoundError();
        }

        return entity;
    }

    // ---------------------------------------------------------

    private async saveAuthorizationState(
        req: Request,
        codeRequest?: OAuth2AuthorizationCodeRequest,
    ) : Promise<string> {
        const ip = getRequestIP(req, {
            trustProxy: true,
        });
        const userAgent = getRequestHeader(req, 'user-agent');

        return this.stateManager.save({
            codeRequest,
            ip,
            userAgent,
        });
    }

    private async verifyAuthorizationState(req: Request): Promise<OAuth2AuthorizationState> {
        const query = useRequestQuery(req);
        if (typeof query.state !== 'string') {
            throw OAuth2Error.stateInvalid();
        }

        return this.stateManager.verify(query.state, {
            ip: getRequestIP(req, {
                trustProxy: true,
            }),
            userAgent: getRequestHeader(req, 'user-agent'),
        });
    }
}
