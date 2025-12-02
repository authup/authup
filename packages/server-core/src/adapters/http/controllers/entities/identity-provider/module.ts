/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DPut, DRequest, DResponse, DTags,
} from '@routup/decorators';
import { getRequestHostName, sendRedirect } from 'routup';
import {
    IdentityProvider,
    IdentityProviderProtocol,
    IdentityType,
    type OAuth2AuthorizeCodeRequest,
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
import { IdentityProviderAccountService, createOAuth2IdentityProviderFlow } from '../../../../../services';
import { setRequestIdentity, useRequestParamID } from '../../../request';
import { ForceLoggedInMiddleware } from '../../../middleware';
import {
    deleteIdentityProviderRouteHandler,
    getManyIdentityProviderRouteHandler,
    getOneIdentityProviderRouteHandler,
    writeIdentityProviderRouteHandler,
} from './handlers';
import {
    IOAuth2AuthorizationCodeRequestVerifier,
    OAuth2AccessTokenIssuer,
    OAuth2AuthorizeCodeRequestValidator, OAuth2KeyRepository,
    OAuth2RefreshTokenIssuer,
    OAuth2TokenSigner,
} from '../../../../../core';
import { OAuth2TokenRepository } from '../../../../database';
import { OAuth2AuthorizeStateRepository } from '../../../../cache';
import { HTTPOAuth2AuthorizeStateManager } from '../../../oauth2/authorize/state/manager';
import { useConfig } from '../../../../../config';
import { HTTPOAuth2IdentityGrantType } from '../../../oauth2';
import { IdentityProviderRepository } from '../../../../database/domains';
import { IdentityProviderControllerOptions } from './types';

@DTags('identity')
@DController('/identity-providers')
export class IdentityProviderController {
    protected codeRequestVerifier : IOAuth2AuthorizationCodeRequestVerifier;

    protected codeRequestValidator : OAuth2AuthorizeCodeRequestValidator;

    // ---------------------------------------------------------

    constructor(options: IdentityProviderControllerOptions) {
        this.codeRequestVerifier = options.codeRequestVerifier;
        this.codeRequestValidator = new OAuth2AuthorizeCodeRequestValidator();
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

        if (
            entity.protocol !== IdentityProviderProtocol.OAUTH2 &&
            entity.protocol !== IdentityProviderProtocol.OIDC
        ) {
            throw new BadRequestError('Only an identity-provider based on the oauth protocol supports authorize redirect.');
        }

        const flow = createOAuth2IdentityProviderFlow(entity);

        const parameters : AuthorizeParameters = {};

        let codeRequest: OAuth2AuthorizeCodeRequest | undefined;
        const query = useRequestQuery(req);
        if (typeof query.codeRequest === 'string') {
            let codeRequestDecoded: OAuth2AuthorizeCodeRequest;

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

        const authorizationStateRepository = new OAuth2AuthorizeStateRepository();
        const authorizationStateManager = new HTTPOAuth2AuthorizeStateManager(
            authorizationStateRepository,
        );
        parameters.state = await authorizationStateManager.save(req, codeRequest);

        return sendRedirect(res, flow.buildRedirectURL(parameters));
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

        if (
            entity.protocol !== IdentityProviderProtocol.OAUTH2 &&
            entity.protocol !== IdentityProviderProtocol.OIDC
        ) {
            throw new Error(`The provider protocol ${entity.protocol} is not valid.`);
        }

        const authorizationStateRepository = new OAuth2AuthorizeStateRepository();

        // todo: use dependency injection
        const authorizationStateManager = new HTTPOAuth2AuthorizeStateManager(authorizationStateRepository);
        const data = await authorizationStateManager.verify(req);
        if (
            entity.realm_id &&
            data.codeRequest &&
            data.codeRequest.realm_id &&
            data.codeRequest.realm_id !== entity.realm_id
        ) {
            throw OAuth2Error.requestInvalid('The provider and client realm do not match.');
        }

        const flow = createOAuth2IdentityProviderFlow(entity);

        const identity = await flow.getIdentityForRequest(req);
        const manager = new IdentityProviderAccountService(dataSource, entity);

        // todo: identity should respect client_id
        const account = await manager.save(identity);

        const config = useConfig();

        const keyRepository = new OAuth2KeyRepository();
        const tokenSigner = new OAuth2TokenSigner(keyRepository);

        const tokenRepository = new OAuth2TokenRepository();

        const grant = new HTTPOAuth2IdentityGrantType({
            accessTokenIssuer: new OAuth2AccessTokenIssuer(
                tokenRepository,
                tokenSigner,
                {
                    issuer: config.publicUrl,
                    maxAge: config.tokenAccessMaxAge,
                },
            ),
            refreshTokenIssuer: new OAuth2RefreshTokenIssuer(
                tokenRepository,
                tokenSigner,
                {
                    issuer: config.publicUrl,
                    maxAge: config.tokenRefreshMaxAge,
                },
            ),
        });

        setRequestIdentity(req, {
            type: IdentityType.USER,
            data: {
                ...account.user,
                realm: entity.realm,
            },
        });

        const token = await grant.runWithRequest(req);

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
}
