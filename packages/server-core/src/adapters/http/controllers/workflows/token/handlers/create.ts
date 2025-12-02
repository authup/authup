/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CookieName } from '@authup/core-http-kit';
import { OAuth2Error, OAuth2TokenGrant } from '@authup/specs';
import type { OAuth2TokenGrantResponse } from '@authup/specs';
import type { SerializeOptions } from '@routup/basic/cookie';
import { setResponseCookie } from '@routup/basic/cookie';
import type { Request, Response } from 'routup';
import { getRequestHostName, send } from 'routup';
import { OAuth2AuthorizationCodeRepository } from '../../../../../index';
import { ConfigDefaults, useConfig } from '../../../../../../config';
import type { IOAuth2Grant } from '../../../../../../core';
import {
    OAuth2AccessTokenIssuer, OAuth2RefreshTokenIssuer,

    OAuth2TokenRevoker, OAuth2TokenSigner, OAuth2TokenVerifier,
} from '../../../../../../core';
import { OAuth2KeyRepository } from '../../../../../../core/oauth2/key';
import { OAuth2TokenRepository } from '../../../../../database';
import {
    HTTPClientCredentialsGrant, HTTPOAuth2RefreshTokenGrant, HTTPPasswordGrant, HTTPRobotCredentialsGrant, guessOauth2GrantTypeByRequest,
} from '../../../../oauth2';
import { OAuth2HTTPAuthorizeGrant } from '../../../../oauth2/grant_types/authorize';

/**
 *
 * @param req
 * @param res
 *
 * @throws OAuth2Error
 */
export async function createTokenRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const grantType = guessOauth2GrantTypeByRequest(req);
    if (!grantType) {
        throw OAuth2Error.grantInvalid();
    }

    const config = useConfig();
    const tokenRepository = new OAuth2TokenRepository();

    const signerRepository = new OAuth2KeyRepository();
    const tokenSigner = new OAuth2TokenSigner(signerRepository);

    const accessTokenIssuer = new OAuth2AccessTokenIssuer(
        tokenRepository,
        tokenSigner,
        {
            maxAge: config.tokenAccessMaxAge,
        },
    );

    const refreshTokenIssuer = new OAuth2RefreshTokenIssuer(
        tokenRepository,
        tokenSigner,
        {
            maxAge: config.tokenRefreshMaxAge,
        },
    );

    const tokenVerifier = new OAuth2TokenVerifier(
        signerRepository,
        tokenRepository,
    );

    const tokenRevoker = new OAuth2TokenRevoker(tokenRepository);

    let grant : IOAuth2Grant;

    switch (grantType) {
        case OAuth2TokenGrant.AUTHORIZATION_CODE: {
            grant = new OAuth2HTTPAuthorizeGrant({
                codeRepository: new OAuth2AuthorizationCodeRepository(),
                accessTokenIssuer,
                refreshTokenIssuer,
            });
            break;
        }
        case OAuth2TokenGrant.CLIENT_CREDENTIALS: {
            grant = new HTTPClientCredentialsGrant({
                accessTokenIssuer,
            });
            break;
        }
        case OAuth2TokenGrant.ROBOT_CREDENTIALS: {
            grant = new HTTPRobotCredentialsGrant({
                accessTokenIssuer,
            });
            break;
        }
        case OAuth2TokenGrant.PASSWORD: {
            grant = new HTTPPasswordGrant({
                accessTokenIssuer,
                refreshTokenIssuer,
            });
            break;
        }
        case OAuth2TokenGrant.REFRESH_TOKEN: {
            grant = new HTTPOAuth2RefreshTokenGrant({
                accessTokenIssuer,
                refreshTokenIssuer,
                tokenVerifier,
                tokenRevoker,
            });
            break;
        }
        default: {
            throw new SyntaxError(`OAuth2 grant type ${grantType} is not supported.`);
        }
    }

    const tokenResponse : OAuth2TokenGrantResponse = await grant.runWith(req);

    const cookieOptions : SerializeOptions = {};
    if (config.cookieDomain) {
        cookieOptions.domain = config.cookieDomain;
    } else if (config.authorizeRedirectUrl !== ConfigDefaults.AUTHORIZE_REDIRECT_URL) {
        cookieOptions.domain = new URL(config.publicUrl).hostname;
    } else {
        cookieOptions.domain = getRequestHostName(req, {
            trustProxy: true,
        });
    }

    setResponseCookie(res, CookieName.ACCESS_TOKEN, tokenResponse.access_token, {
        ...cookieOptions,
        maxAge: config.tokenAccessMaxAge * 1000,
    });

    setResponseCookie(res, CookieName.REFRESH_TOKEN, tokenResponse.refresh_token, {
        ...cookieOptions,
        maxAge: config.tokenRefreshMaxAge * 1000,
    });

    return send(res, tokenResponse);
}
