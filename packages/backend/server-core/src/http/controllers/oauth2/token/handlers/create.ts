/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/* istanbul ignore next */
import {
    OAuth2TokenGrant, OAuth2TokenResponse, TokenError,
} from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../../type';
import {
    AuthorizeGrantType,
    ClientCredentialsGrant,
    Grant,
    PasswordGrantType,
    RefreshTokenGrantType,
    RobotCredentialsGrantType,
    guessOauth2GrantTypeByRequest,
} from '../../../../../oauth2';
import { useConfig } from '../../../../../config';

/**
 *
 * @param req
 * @param res
 *
 * @throws TokenError
 */
export async function createTokenRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
) : Promise<any> {
    const grantType = guessOauth2GrantTypeByRequest(req);
    if (!grantType) {
        throw TokenError.grantInvalid();
    }

    const config = await useConfig();

    let grant : Grant | undefined;

    switch (grantType) {
        case OAuth2TokenGrant.AUTHORIZATION_CODE: {
            grant = new AuthorizeGrantType(config);
            break;
        }
        case OAuth2TokenGrant.CLIENT_CREDENTIALS: {
            grant = new ClientCredentialsGrant(config);
            break;
        }
        case OAuth2TokenGrant.ROBOT_CREDENTIALS: {
            grant = new RobotCredentialsGrantType(config);
            break;
        }
        case OAuth2TokenGrant.PASSWORD: {
            grant = new PasswordGrantType(config);
            break;
        }
        case OAuth2TokenGrant.REFRESH_TOKEN: {
            grant = new RefreshTokenGrantType(config);
            break;
        }
    }

    const tokenResponse : OAuth2TokenResponse = await grant.run(req);

    return res.respond({
        data: tokenResponse,
    });
}
