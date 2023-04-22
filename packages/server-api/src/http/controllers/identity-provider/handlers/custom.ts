/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildHTTPClientConfigForProxy } from '@authup/server-core';
import { BadRequestError, NotFoundError } from '@ebec/http';
import type { OAuth2TokenGrantResponse } from '@authup/core';
import {
    CookieName,
    IdentityProviderProtocol,
    buildIdentityProviderAuthorizeCallbackPath,
} from '@authup/core';
import type { SerializeOptions } from '@routup/cookie';
import { setResponseCookie } from '@routup/cookie';
import { useRequestQuery } from '@routup/query';
import type { Request, Response } from 'routup';
import { sendRedirect, useRequestParam } from 'routup';
import { URL } from 'node:url';
import type { RequestBaseOptions } from '@hapic/oauth2';
import { OAuth2Client } from '@hapic/oauth2';
import { useDataSource } from 'typeorm-extension';
import { IdentityProviderRepository, createOauth2ProviderAccount } from '../../../../domains';
import { setRequestEnv } from '../../../utils';
import { InternalGrantType } from '../../../oauth2';
import { useConfig } from '../../../../config';

export async function authorizeURLIdentityProviderRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const dataSource = await useDataSource();
    const repository = new IdentityProviderRepository(dataSource);
    const entity = await repository.createQueryBuilder('provider')
        .leftJoinAndSelect('provider.realm', 'realm')
        .where('provider.id = :id', { id })
        .getOne();

    if (!entity) {
        throw new NotFoundError();
    }

    const provider = await repository.extendEntity(entity);

    if (
        provider.protocol !== IdentityProviderProtocol.OAUTH2 &&
        provider.protocol !== IdentityProviderProtocol.OIDC
    ) {
        throw new BadRequestError('Only an identity-provider based on the oauth protocol supports authorize redirect.');
    }

    const config = await useConfig();

    const oauth2Client = new OAuth2Client({
        options: {
            clientId: provider.client_id,
            authorizationEndpoint: provider.authorize_url,
            redirectUri: `${config.get('publicUrl')}${buildIdentityProviderAuthorizeCallbackPath(entity.id)}`,
        },
    });

    return sendRedirect(res, oauth2Client.authorize.buildURL({}));
}

/* istanbul ignore next */
export async function authorizeCallbackIdentityProviderRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const id = useRequestParam(req, 'id');
    const { code, state } = useRequestQuery(req);

    const dataSource = await useDataSource();
    const repository = new IdentityProviderRepository(dataSource);
    const entity = await repository.createQueryBuilder('provider')
        .leftJoinAndSelect('provider.realm', 'realm')
        .where('provider.id = :id', { id })
        .getOne();

    if (!entity) {
        throw new NotFoundError();
    }

    const provider = await repository.extendEntity(entity);

    if (
        provider.protocol !== IdentityProviderProtocol.OAUTH2 &&
        provider.protocol !== IdentityProviderProtocol.OIDC
    ) {
        throw new Error(`The provider protocol ${provider.protocol} is not valid.`);
    }

    const config = await useConfig();

    let request: RequestBaseOptions;

    try {
        request = await buildHTTPClientConfigForProxy(provider.token_url);
    } catch (e) {
        throw new BadRequestError(`The http tunnel could not be created for url: ${provider.token_url}`);
    }

    const oauth2Client = new OAuth2Client({
        request,
        options: {
            clientId: provider.client_id,
            clientSecret: provider.client_secret,

            tokenEndpoint: provider.token_url,

            redirectUri: `${config.get('publicUrl')}${buildIdentityProviderAuthorizeCallbackPath(provider.id)}`,
        },
    });

    let tokenResponse : OAuth2TokenGrantResponse;

    try {
        tokenResponse = await oauth2Client.token.createWithAuthorizeGrant({
            code: code as string,
            state: state as string,
        });
    } catch (e) {
        throw new BadRequestError('The oauth2 code could not be exchanged for an access-token.');
    }

    const account = await createOauth2ProviderAccount(provider, tokenResponse);
    const grant = new InternalGrantType();

    setRequestEnv(req, 'userId', account.user_id);
    setRequestEnv(req, 'realm', entity.realm);

    const token = await grant.run(req);

    const cookieOptions : SerializeOptions = {
        ...(process.env.NODE_ENV === 'production' ? {
            domain: new URL(config.get('publicUrl')).hostname,
        } : {}),
    };

    setResponseCookie(res, CookieName.ACCESS_TOKEN, token.access_token, {
        ...cookieOptions,
        maxAge: config.get('tokenMaxAgeAccessToken') * 1000,
    });

    setResponseCookie(res, CookieName.REFRESH_TOKEN, token.refresh_token, {
        ...cookieOptions,
        maxAge: config.get('tokenMaxAgeRefreshToken') * 1000,
    });

    return sendRedirect(res, config.get('authorizeRedirectUrl'));
}
