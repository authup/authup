/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { base64URLDecode } from '@authup/kit';
import { OAuth2Error } from '@authup/specs';
import { BadRequestError, NotFoundError } from '@ebec/http';
import type { OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import {
    IdentityProviderProtocol,
} from '@authup/core-kit';
import {
    CookieName,
} from '@authup/core-http-kit';
import type { AuthorizeParameters } from '@hapic/oauth2';
import { setResponseCookie } from '@routup/basic/cookie';
import { useRequestQuery } from '@routup/basic/query';
import { URL } from 'node:url';
import type { Request, Response } from 'routup';
import { getRequestHostName, sendRedirect } from 'routup';
import type { DataSource } from 'typeorm';
import { useDataSource } from 'typeorm-extension';
import {
    IdentityProviderRepository,
} from '../../../../../database/domains';
import { createOAuth2IdentityProviderFlow } from '../../../../../domains';
import { IdentityProviderAccountService } from '../../../../../services';
import type { OAuth2AuthorizeStateData } from '../../../../oauth2';
import { InternalGrantType, OAuth2AuthorizationStateManager, useOAuth2AuthorizationService } from '../../../../oauth2';
import { setRequestIdentity, useRequestParamID } from '../../../../request';
import { useConfig } from '../../../../../config';

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

    const stateData : OAuth2AuthorizeStateData = {};
    const query = useRequestQuery(req);
    if (typeof query.codeRequest === 'string') {
        let codeRequestRaw: OAuth2AuthorizationCodeRequest;

        try {
            codeRequestRaw = JSON.parse(base64URLDecode(query.codeRequest));
        } catch (e) {
            throw OAuth2Error.requestInvalid('The code request is malformed and can not be parsed.');
        }

        const authorizationManager = useOAuth2AuthorizationService();
        const validationResult = await authorizationManager.validate(codeRequestRaw);

        if (
            validationResult.client.realm_id &&
            entity.realm_id &&
            entity.realm_id !== validationResult.client.realm_id
        ) {
            throw OAuth2Error.requestInvalid('The provider and client realm do not match.');
        }

        stateData.codeRequest = validationResult.data;
    }

    const authorizationStateManager = new OAuth2AuthorizationStateManager();
    parameters.state = await authorizationStateManager.create(req, stateData);

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

    const authorizationStateManager = new OAuth2AuthorizationStateManager();
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
    const grant = new InternalGrantType();

    setRequestIdentity(req, {
        type: 'user',
        id: account.user_id,
        realmId: entity.realm.id,
        realmName: entity.realm.name,
    });

    const token = await grant.run(req);
    const config = useConfig();

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
