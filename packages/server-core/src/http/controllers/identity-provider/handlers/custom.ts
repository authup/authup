/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { NotFoundError } from '@ebec/http';
import {
    CookieName,
    IdentityProviderProtocol,
    OAuth2TokenGrantResponse,
    buildIdentityProviderAuthorizeCallbackPath,
} from '@authelion/common';
import { SerializeOptions, setResponseCookie } from '@routup/cookie';
import { useRequestQuery } from '@routup/query';
import {
    Request, Response, sendRedirect, useRequestParam,
} from 'routup';
import { URL } from 'url';
import { Client } from '@hapic/oauth2';
import { useDataSource } from 'typeorm-extension';
import { IdentityProviderRepository, createOauth2ProviderAccount } from '../../../../domains';
import { ProxyConnectionConfig, detectProxyConnectionConfig } from '../../../../utils';
import { InternalGrantType } from '../../../../oauth2';
import { useConfig } from '../../../../config';
import { setRequestEnv } from '../../../utils';

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
        throw new Error();
        // todo: better error :)
    }

    const config = await useConfig();

    const oauth2Client = new Client({
        options: {
            client_id: provider.client_id,
            authorization_endpoint: provider.authorize_url,
            redirect_uri: `${config.selfUrl}${buildIdentityProviderAuthorizeCallbackPath(entity.id)}`,
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
        throw new Error();
        // todo: better error :)
    }

    const config = await useConfig();
    const proxyConfig : ProxyConnectionConfig | undefined = detectProxyConnectionConfig();

    const oauth2Client = new Client({
        ...(proxyConfig ? { driver: { proxy: proxyConfig } } : {}),
        options: {
            client_id: provider.client_id,
            client_secret: provider.client_secret,

            token_endpoint: provider.token_url,

            redirect_uri: `${config.selfUrl}${buildIdentityProviderAuthorizeCallbackPath(provider.id)}`,
        },
    });

    const tokenResponse : OAuth2TokenGrantResponse = await oauth2Client.token.createWithAuthorizeGrant({
        code: code as string,
        state: state as string,
    });

    const account = await createOauth2ProviderAccount(provider, tokenResponse);
    const grant = new InternalGrantType(config);

    setRequestEnv(req, 'userId', account.user_id);
    setRequestEnv(req, 'realmId', entity.realm_id);

    const token = await grant.run(req);

    const cookieOptions : SerializeOptions = {
        ...(process.env.NODE_ENV === 'production' ? {
            domain: new URL(config.webUrl).hostname,
        } : {}),
    };

    setResponseCookie(res, CookieName.ACCESS_TOKEN, token.access_token, {
        ...cookieOptions,
        maxAge: config.tokenMaxAgeAccessToken * 1000,
    });

    setResponseCookie(res, CookieName.REFRESH_TOKEN, token.refresh_token, {
        ...cookieOptions,
        maxAge: config.tokenMaxAgeRefreshToken * 1000,
    });

    return sendRedirect(res, config.webUrl);
}
