/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { NotFoundError } from '@typescript-error/http';
import {
    CookieName,
    HTTPOAuth2Client,
    OAuth2TokenResponse,
    OAuth2TokenSubKind,
    buildOAuth2ProviderAuthorizeCallbackPath,
    determineAccessTokenMaxAge,
    determineRefreshTokenMaxAge,
} from '@authelion/common';
import { URL } from 'url';
import { CookieOptions } from 'express';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { OAuth2ProviderEntity, createOauth2ProviderAccount } from '../../../../domains';
import { ProxyConnectionConfig, detectProxyConnectionConfig } from '../../../../utils';
import { InternalGrantType } from '../../../../oauth2/grant-types/internal';
import { useDataSource } from '../../../../database';
import { useConfig } from '../../../../config';

export async function authorizeURLOauth2ProviderRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
) : Promise<any> {
    const { id } = req.params;

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(OAuth2ProviderEntity);
    const provider = await repository.createQueryBuilder('provider')
        .leftJoinAndSelect('provider.realm', 'realm')
        .where('provider.id = :id', { id })
        .getOne();

    if (!provider) {
        throw new NotFoundError();
    }

    const config = await useConfig();

    const oauth2Client = new HTTPOAuth2Client({
        client_id: provider.client_id,
        token_host: provider.token_host,
        authorize_host: provider.authorize_host,
        authorize_path: provider.authorize_path,
        redirect_uri: `${config.selfUrl}${buildOAuth2ProviderAuthorizeCallbackPath(provider.id)}`,
    });

    return res.redirect(oauth2Client.buildAuthorizeURL({}));
}

/* istanbul ignore next */
export async function authorizeCallbackOauth2ProviderRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
) : Promise<any> {
    const { id } = req.params;
    const { code, state } = req.query;

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(OAuth2ProviderEntity);
    const provider = await repository.createQueryBuilder('provider')
        .addSelect('provider.client_secret')
        .leftJoinAndSelect('provider.realm', 'realm')
        .where('provider.id = :id', { id })
        .getOne();

    if (!provider) {
        throw new NotFoundError();
    }

    const config = await useConfig();
    const proxyConfig : ProxyConnectionConfig | undefined = detectProxyConnectionConfig();

    const oauth2Client = new HTTPOAuth2Client({
        client_id: provider.client_id,
        client_secret: provider.client_secret,

        token_host: provider.token_host,
        token_path: provider.token_path,

        redirect_uri: `${config.selfUrl}${buildOAuth2ProviderAuthorizeCallbackPath(provider.id)}`,
    }, proxyConfig ? { driver: { proxy: proxyConfig } } : {});

    const tokenResponse : OAuth2TokenResponse = await oauth2Client.getTokenWithAuthorizeGrant({
        code: code as string,
        state: state as string,
    });

    const account = await createOauth2ProviderAccount(provider, tokenResponse);
    const grant = new InternalGrantType(config);

    const token = await grant
        .setEntity({
            kind: OAuth2TokenSubKind.USER,
            data: account.user_id,
        })
        .setRealm(provider.realm_id)
        .run(req);

    const cookieOptions : CookieOptions = {

        ...(process.env.NODE_ENV === 'production' ? {
            domain: new URL(config.webUrl).hostname,
        } : {}),
    };

    res.cookie(CookieName.ACCESS_TOKEN, token.access_token, {
        ...cookieOptions,
        maxAge: config.tokenMaxAgeAccessToken * 1000,
    });

    res.cookie(CookieName.REFRESH_TOKEN, token.refresh_token, {
        ...cookieOptions,
        maxAge: config.tokenMaxAgeRefreshToken * 1000,
    });

    return res.redirect(config.webUrl);
}
