/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2TokenGrant } from '@authup/specs';
import { AuthorizeGrantType } from './authorize';
import { ClientCredentialsGrant } from './client-credentials';
import { RobotCredentialsGrantType } from './robot-credentials';
import { PasswordGrantType } from './password';
import { RefreshTokenGrantType } from './refresh-token';
import type { Grant } from './type';

export function createOAuth2Grant(type: `${OAuth2TokenGrant}`): Grant {
    switch (type) {
        case OAuth2TokenGrant.AUTHORIZATION_CODE: {
            return new AuthorizeGrantType();
        }
        case OAuth2TokenGrant.CLIENT_CREDENTIALS: {
            return new ClientCredentialsGrant();
        }
        case OAuth2TokenGrant.ROBOT_CREDENTIALS: {
            return new RobotCredentialsGrantType();
        }
        case OAuth2TokenGrant.PASSWORD: {
            return new PasswordGrantType();
        }
        case OAuth2TokenGrant.REFRESH_TOKEN: {
            return new RefreshTokenGrantType();
        }
    }

    throw new SyntaxError(`OAuth2 gran type ${type} is not supported.`);
}
