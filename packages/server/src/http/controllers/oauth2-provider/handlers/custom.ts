/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getRepository } from 'typeorm';
import { BadRequestError, NotFoundError } from '@typescript-error/http';
import {
    OAuth2AccessTokenPayload,
    OAuth2HTTPClient,
    OAuth2TokenSubKind,
    Oauth2TokenResponse,
} from '@typescript-auth/domains';

import { URL } from 'url';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { OAuth2ProviderEntity, createOauth2ProviderAccountWithToken } from '../../../../domains';
import { Oauth2ProviderRouteAuthorizeCallbackContext, Oauth2ProviderRouteAuthorizeContext } from './type';
import { ProxyConnectionConfig, detectProxyConnectionConfig, signToken } from '../../../../utils';
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

    const oauth2Client = new OAuth2HTTPClient({
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

    const oauth2Client = new OAuth2HTTPClient({
        client_id: provider.client_id,
        client_secret: provider.client_secret,

        token_host: provider.token_host,
        token_path: provider.token_path,

        redirect_uri: `${context.selfUrl}${context.selfCallbackPath ?? `/oauth2-providers/${provider.id}/authorize-callback`}`,
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

    const cookie : Oauth2TokenResponse = {
        access_token: token.access_token,
        expires_in: token.expires_in,
        token_type: 'Bearer',
    };

    res.cookie('auth_token', JSON.stringify(cookie), {
        maxAge: expiresIn * 1000,
        ...(process.env.NODE_ENV === 'production' ? {
            domain: new URL(context.redirectUrl).hostname,
        } : {}),
    });

    return res.redirect(context.redirectUrl);
}
