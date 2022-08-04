/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { NotFoundError } from '@typescript-error/http';
import {
    CookieName,
    OAuth2TokenGrantResponse,
    buildOAuth2ProviderAuthorizeCallbackPath,
} from '@authelion/common';
import { URL } from 'url';
import { CookieOptions } from 'express';
import { Client, removeDuplicateForwardSlashesFromURL } from '@hapic/oauth2';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { OAuth2ProviderEntity, createOauth2ProviderAccount } from '../../../../domains';
import { ProxyConnectionConfig, detectProxyConnectionConfig } from '../../../../utils';
import { InternalGrantType } from '../../../../oauth2';
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

    const oauth2Client = new Client({
        options: {
            client_id: provider.client_id,
            authorization_endpoint: removeDuplicateForwardSlashesFromURL(provider.authorize_host + provider.authorize_path),
            redirect_uri: `${config.selfUrl}${buildOAuth2ProviderAuthorizeCallbackPath(provider.id)}`,
        },
    });

    return res.redirect(oauth2Client.authorize.buildURL({}));
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

    const oauth2Client = new Client({
        ...(proxyConfig ? { driver: { proxy: proxyConfig } } : {}),
        options: {
            client_id: provider.client_id,
            client_secret: provider.client_secret,

            token_endpoint: removeDuplicateForwardSlashesFromURL(provider.token_host + provider.token_path),

            redirect_uri: `${config.selfUrl}${buildOAuth2ProviderAuthorizeCallbackPath(provider.id)}`,
        },
    });

    const tokenResponse : OAuth2TokenGrantResponse = await oauth2Client.token.createWithAuthorizeGrant({
        code: code as string,
        state: state as string,
    });

    const account = await createOauth2ProviderAccount(provider, tokenResponse);
    const grant = new InternalGrantType(config);

    req.userId = account.user_id;
    req.realmId = provider.realm_id;

    const token = await grant.run(req);

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
