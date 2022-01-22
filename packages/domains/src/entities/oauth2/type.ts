/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2AccessTokenPayload } from '../oauth2-access-token';

export type Oauth2TokenResponse = {
    access_token: string,

    access_token_payload?: OAuth2AccessTokenPayload,

    refresh_token?: string,

    expires_in: number,

    token_type: string,

    id_token?: string,

    id_token_payload?: Record<string, any>,

    mac_key?: string,

    mac_algorithm?: string,

    scope?: string
};
