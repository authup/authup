/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { BadRequestError, NotFoundError } from '@typescript-error/http';
import { Oauth2Client, Oauth2TokenResponse } from '@typescript-auth/core';

import { URL } from 'url';
import {
    OAuth2Provider,
    ProxyConnectionConfig,
    TokenPayload,
    detectProxyConnectionConfig,
} from '@typescript-auth/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { createToken } from '../../../../security';
import { createOauth2ProviderAccountWithToken } from '../../../../domains/oauth2-provider-account/utils';
import { Oauth2ProviderRouteAuthorizeCallbackContext, Oauth2ProviderRouteAuthorizeContext } from './type';

export async function authorizeOauth2ProviderRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
    context: Oauth2ProviderRouteAuthorizeContext,
) : Promise<any> {
    const { id } = req.params;

    const repository = getRepository(OAuth2Provider);
    const provider = await repository.createQueryBuilder('provider')
        .leftJoinAndSelect('provider.realm', 'realm')
        .where('provider.id = :id', { id })
        .getOne();

    if (typeof provider === 'undefined') {
        throw new NotFoundError();
    }

    const oauth2Client = new Oauth2Client({
        client_id: provider.client_id,
        token_host: provider.token_host,
        authorize_host: provider.authorize_host,
        authorize_path: provider.authorize_path,
        redirect_uri: `${context.selfUrl}${context.selfCallbackPath ?? `/providers/${provider.id}/authorize-callback`}`,
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

    const repository = getRepository(OAuth2Provider);
    const provider = await repository.createQueryBuilder('provider')
        .addSelect('provider.client_secret')
        .leftJoinAndSelect('provider.realm', 'realm')
        .where('provider.id = :id', { id })
        .getOne();

    if (typeof provider === 'undefined') {
        throw new NotFoundError();
    }
    const proxyConfig : ProxyConnectionConfig | undefined = detectProxyConnectionConfig();

    const oauth2Client = new Oauth2Client({
        client_id: provider.client_id,
        client_secret: provider.client_secret,

        token_host: provider.token_host,
        token_path: provider.token_path,

        redirect_uri: `${context.selfUrl}${context.selfCallbackPath ?? `/providers/${provider.id}/authorize-callback`}`,
    }, proxyConfig ? { proxy: proxyConfig } : {});

    const tokenResponse : Oauth2TokenResponse = await oauth2Client.getTokenWithAuthorizeGrant({
        code: code as string,
        state: state as string,
    });

    if (typeof tokenResponse.access_token_payload === 'undefined') {
        throw new BadRequestError('The accessToken could not be decoded.');
    }

    const account = await createOauth2ProviderAccountWithToken(provider, tokenResponse);
    const expiresIn = context.maxAge;

    const tokenPayload : TokenPayload = {
        iss: context.selfUrl,
        sub: account.user.id,
        remoteAddress: req.ip,
    };

    const token = await createToken(tokenPayload, expiresIn, { directory: context.rsaKeyPairPath });

    const cookie : Oauth2TokenResponse = {
        access_token: token,
        expires_in: expiresIn,
        token_type: 'Bearer',
    };

    res.cookie('auth_token', JSON.stringify(cookie), {
        maxAge: expiresIn * 1000,
        ...(process.env.NODE_ENV === 'production' ? {
            domain: new URL(context.webUrl).hostname,
        } : {}),
    });

    return res.redirect(context.webUrl);
}
