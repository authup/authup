/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { base64URLDecode } from '@authup/kit';
import { OAuth2Error } from '@authup/specs';
import { BadRequestError, NotFoundError } from '@ebec/http';
import type { OAuth2AuthorizeCodeRequest } from '@authup/core-kit';
import {
    IdentityProviderProtocol,
    IdentityType,
} from '@authup/core-kit';
import {
    CookieName,
} from '@authup/core-http-kit';
import type { AuthorizeParameters } from '@hapic/oauth2';
import { setResponseCookie } from '@routup/basic/cookie';
import { useRequestQuery } from '@routup/basic/query';
import { URL } from 'node:url';
import type { Request, Response } from 'routup';
import {
    getRequestHostName, sendRedirect,
} from 'routup';
import type { DataSource } from 'typeorm';
import { useDataSource } from 'typeorm-extension';
import { OAuth2AuthorizeStateRepository } from '../../../../../index';
import { OAuth2KeyRepository } from '../../../../../../core/oauth2/key';
import { OAuth2ClientRepository, OAuth2ClientScopeRepository, OAuth2TokenRepository } from '../../../../../database';
import {
    IdentityProviderRepository,
} from '../../../../../database/domains';
import { createOAuth2IdentityProviderFlow } from '../../../../../../domains';
import { IdentityProviderAccountService } from '../../../../../../services';
import {
    OAuth2AccessTokenIssuer,
    OAuth2AuthorizationCodeVerifier, OAuth2AuthorizeCodeRequestValidator, OAuth2RefreshTokenIssuer, OAuth2TokenSigner,
} from '../../../../../../core';
import { HTTPOAuth2IdentityGrantType } from '../../../../oauth2';
import { HTTPOAuth2AuthorizeStateManager } from '../../../../oauth2/authorize/state/manager';
import { setRequestIdentity, useRequestParamID } from '../../../../request';
import { useConfig } from '../../../../../../config';

async function resolve(dataSource: DataSource, id: string) {
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

export async function authorizeURLIdentityProviderRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const id = useRequestParamID(req);

    const dataSource = await useDataSource();
    const entity = await resolve(dataSource, id);

    if (
        entity.protocol !== IdentityProviderProtocol.OAUTH2 &&
        entity.protocol !== IdentityProviderProtocol.OIDC
    ) {
        throw new BadRequestError('Only an identity-provider based on the oauth protocol supports authorize redirect.');
    }

    const flow = createOAuth2IdentityProviderFlow(entity);

    const parameters : AuthorizeParameters = {};

    const query = useRequestQuery(req);
    if (typeof query.codeRequest !== 'string') {
        throw OAuth2Error.codeRequestInvalid();
    }

    let codeRequestDecoded: OAuth2AuthorizeCodeRequest;

    try {
        codeRequestDecoded = JSON.parse(base64URLDecode(query.codeRequest));
    } catch (e) {
        throw OAuth2Error.requestInvalid('The code request is malformed and can not be parsed.');
    }

    const codeRequestValidator = new OAuth2AuthorizeCodeRequestValidator();
    const codeRequest = await codeRequestValidator.run(codeRequestDecoded);

    const authorizationCodeVerifier = new OAuth2AuthorizationCodeVerifier({
        clientRepository: new OAuth2ClientRepository(),
        clientScopeRepository: new OAuth2ClientScopeRepository(),
    });
    const data = await authorizationCodeVerifier.verify(codeRequest);

    if (
        data.client.realm_id &&
        entity.realm_id &&
        entity.realm_id !== data.client.realm_id
    ) {
        throw OAuth2Error.requestInvalid('The provider and client realm do not match.');
    }

    const authorizationStateRepository = new OAuth2AuthorizeStateRepository();
    const authorizationStateManager = new HTTPOAuth2AuthorizeStateManager(
        authorizationStateRepository,
    );
    parameters.state = await authorizationStateManager.save(req, data.data);

    return sendRedirect(res, flow.buildRedirectURL(parameters));
}

/* istanbul ignore next */
export async function authorizeCallbackIdentityProviderRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const id = useRequestParamID(req);
    const dataSource = await useDataSource();

    const entity = await resolve(dataSource, id);

    if (
        entity.protocol !== IdentityProviderProtocol.OAUTH2 &&
        entity.protocol !== IdentityProviderProtocol.OIDC
    ) {
        throw new Error(`The provider protocol ${entity.protocol} is not valid.`);
    }

    const authorizationStateRepository = new OAuth2AuthorizeStateRepository();
    const authorizationStateManager = new HTTPOAuth2AuthorizeStateManager(authorizationStateRepository);
    const data = await authorizationStateManager.verify(req);
    if (
        data.codeRequest.realm_id &&
        entity.realm_id &&
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
