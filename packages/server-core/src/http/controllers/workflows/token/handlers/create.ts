/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CookieName } from '@authup/core-http-kit';
import { OAuth2Error } from '@authup/specs';
import type { OAuth2TokenGrantResponse } from '@authup/specs';
import type { SerializeOptions } from '@routup/basic/cookie';
import { setResponseCookie } from '@routup/basic/cookie';
import type { Request, Response } from 'routup';
import { getRequestHostName, send } from 'routup';
import { ConfigDefaults, useConfig } from '../../../../../config';
import {
    guessOauth2GrantTypeByRequest,
} from '../../../../oauth2';
import { createOAuth2Grant } from '../../../../oauth2/grant-types/create';

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

    const grant = createOAuth2Grant(grantType);

    const config = useConfig();

    const tokenResponse : OAuth2TokenGrantResponse = await grant.run(req);

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
