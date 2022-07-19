/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2AccessTokenVerification } from '../oauth2-access-token';
import { OAuth2RefreshTokenVerification } from '../oauth2-refresh-token';

export type OAuth2TokenResponse = {
    access_token: string,

    refresh_token?: string,

    expires_in: number,

    token_type: string,

    id_token?: string,

    mac_key?: string,

    mac_algorithm?: string,

    scope?: string
};

// -----------------------------------------------------------------

export type OAuth2TokenVerification = OAuth2AccessTokenVerification |
OAuth2RefreshTokenVerification;
