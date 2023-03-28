/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/* istanbul ignore next */
import type { OAuth2TokenGrantResponse } from '@authup/common';
import {
    OAuth2TokenGrant, TokenError,
} from '@authup/common';
import type { Request, Response } from 'routup';
import { send } from 'routup';
import type { Grant } from '../../../../oauth2';
import {
    AuthorizeGrantType,
    ClientCredentialsGrant,
    PasswordGrantType,
    RefreshTokenGrantType,
    RobotCredentialsGrantType,
    guessOauth2GrantTypeByRequest,
} from '../../../../oauth2';

/**
 *
 * @param req
 * @param res
 *
 * @throws TokenError
 */
export async function createTokenRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const grantType = guessOauth2GrantTypeByRequest(req);
    if (!grantType) {
        throw TokenError.grantInvalid();
    }

    let grant : Grant | undefined;

    switch (grantType) {
        case OAuth2TokenGrant.AUTHORIZATION_CODE: {
            grant = new AuthorizeGrantType();
            break;
        }
        case OAuth2TokenGrant.CLIENT_CREDENTIALS: {
            grant = new ClientCredentialsGrant();
            break;
        }
        case OAuth2TokenGrant.ROBOT_CREDENTIALS: {
            grant = new RobotCredentialsGrantType();
            break;
        }
        case OAuth2TokenGrant.PASSWORD: {
            grant = new PasswordGrantType();
            break;
        }
        case OAuth2TokenGrant.REFRESH_TOKEN: {
            grant = new RefreshTokenGrantType();
            break;
        }
    }

    const tokenResponse : OAuth2TokenGrantResponse = await grant.run(req);

    return send(res, tokenResponse);
}
