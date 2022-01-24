/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { NotFoundError } from '@typescript-error/http';
import {
    CookieName,
    HTTPOAuth2Client,
    OAuth2TokenSubKind, Oauth2TokenResponse,
} from '@typescript-auth/domains';

import { URL } from 'url';
import { CookieOptions } from 'express';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { OAuth2ProviderEntity, createOauth2ProviderAccount } from '../../../../domains';
import { Oauth2ProviderRouteAuthorizeCallbackContext, Oauth2ProviderRouteAuthorizeContext } from './type';
import { ProxyConnectionConfig, detectProxyConnectionConfig } from '../../../../utils';
import { InternalGrantType } from '../../../oauth2/grant-types/internal';

export async function authorizeOauth2ProviderRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
    context: Oauth2ProviderRouteAuthorizeContext,
) : Promise<any> {
    const { id } = req.params;

    const repository = getRepository(OAuth2ProviderEntity);
    const provider = await repository.createQueryBuilder('provider')
        .leftJoinAndSelect('provider.realm', 'realm')
        .where('provider.id = :id', { id })
        .getOne();

    if (typeof provider === 'undefined') {
        throw new NotFoundError();
    }

    const oauth2Client = new HTTPOAuth2Client({
        client_id: provider.client_id,
        token_host: provider.token_host,
        authorize_host: provider.authorize_host,
        authorize_path: provider.authorize_path,
        redirect_uri: `${context.selfUrl}${context.selfCallbackPath ?? `/oauth2-providers/${provider.id}/authorize-callback`}`,
    });

    return res.redirect(oauth2Client.buildAuthorizeURL({}));
}

/* istanbul ignore next */
export async function authorizeCallbackOauth2ProviderRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
    context: Oauth2ProviderRouteAuthorizeCallbackContext,
) : Promise<any> {
    const { id } = req.params;
    const { code, state } = req.query;

    const repository = getRepository(OAuth2ProviderEntity);
    const provider = await repository.createQueryBuilder('provider')
        .addSelect('provider.client_secret')
        .leftJoinAndSelect('provider.realm', 'realm')
        .where('provider.id = :id', { id })
        .getOne();

    if (typeof provider === 'undefined') {
        throw new NotFoundError();
    }
    const proxyConfig : ProxyConnectionConfig | undefined = detectProxyConnectionConfig();

    const oauth2Client = new HTTPOAuth2Client({
        client_id: provider.client_id,
        client_secret: provider.client_secret,

        token_host: provider.token_host,
        token_path: provider.token_path,

        redirect_uri: `${context.selfUrl}${context.selfCallbackPath ?? `/oauth2-providers/${provider.id}/authorize-callback`}`,
    }, proxyConfig ? { driver: { proxy: proxyConfig } } : {});

    const tokenResponse : Oauth2TokenResponse = await oauth2Client.getTokenWithAuthorizeGrant({
        code: code as string,
        state: state as string,
    });

    const account = await createOauth2ProviderAccount(provider, tokenResponse);
    const expiresIn = context.maxAge || 3600;

    const grant = new InternalGrantType({
        request: req,
        maxAge: context.maxAge,
        entity: {
            kind: OAuth2TokenSubKind.USER,
            data: account.user_id,
        },
        realm: provider.realm_id,
        selfUrl: context.selfUrl,
        keyPairOptions: {
            directory: context.rsaKeyPairPath,
        },
    });

    const token = await grant.run();

    const cookieOptions : CookieOptions = {
        maxAge: expiresIn * 1000,
        ...(process.env.NODE_ENV === 'production' ? {
            domain: new URL(context.redirectUrl).hostname,
        } : {}),
    };

    res.cookie(CookieName.ACCESS_TOKEN, token.access_token, cookieOptions);
    res.cookie(CookieName.REFRESH_TOKEN, token.refresh_token, {
        ...cookieOptions,
        maxAge: expiresIn * 1000 * 3,
    });

    return res.redirect(context.redirectUrl);
}
