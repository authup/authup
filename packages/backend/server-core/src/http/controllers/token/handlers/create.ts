/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/* istanbul ignore next */
import {
    OAuth2TokenGrant, OAuth2TokenResponse, TokenError,
} from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { determineRequestTokenGrantType } from '../../../oauth2/grant-types/utils/determine';
import { Grant } from '../../../oauth2/grant-types/type';
import { PasswordGrantType, RobotCredentialsGrantType } from '../../../oauth2';
import { RefreshTokenGrantType } from '../../../oauth2/grant-types/refresh-token';
import { useConfig } from '../../../../config';

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
    const grantType = determineRequestTokenGrantType(req);
    if (!grantType) {
        throw TokenError.grantInvalid();
    }

    const config = await useConfig();

    let grant : Grant | undefined;

    switch (grantType) {
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
