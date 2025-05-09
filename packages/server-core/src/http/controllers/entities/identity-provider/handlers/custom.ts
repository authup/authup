/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, NotFoundError } from '@ebec/http';
import {
    IdentityProviderProtocol,
} from '@authup/core-kit';
import {
    CookieName,
} from '@authup/core-http-kit';
import type { AuthorizeParameters } from '@hapic/oauth2';
import { setResponseCookie } from '@routup/basic/cookie';
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
import { setRequestIdentity, useRequestParamID } from '../../../../request';
import { InternalGrantType, useOAuth2AuthorizationService } from '../../../../oauth2';
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

    const authorizationService = useOAuth2AuthorizationService();

    const state = authorizationService.extractCodeRequest(req);
    if (state) {
        parameters.state = state;
    }

    // todo: maybe verify if state.payload.realm_id = identity_provider.realm_id

    return sendRedirect(res, flow.buildAuthorizeURL(parameters));
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

    const flow = createOAuth2IdentityProviderFlow(entity);

    // todo: identity should respect client_id
    const identity = await flow.getIdentityForRequest(req);
    const manager = new IdentityProviderAccountService(dataSource, entity);

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

    const authorizationService = useOAuth2AuthorizationService();
    const state = authorizationService.extractCodeRequest(req);
    if (state) {
        const params = authorizationService.decodeCodeRequest(state);
        const keys = Object.keys(params);

        const url = new URL('/authorize', config.publicUrl);
        for (let i = 0; i < keys.length; i++) {
            url.searchParams.set(keys[i], params[keys[i]]);
        }

        return sendRedirect(res, url.href);
    }

    return sendRedirect(res, config.authorizeRedirectUrl || config.publicUrl);
}
