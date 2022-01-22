/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2AccessTokenGrant, TokenGrantType } from '@typescript-auth/domains';
import { ExpressRequest } from '../../../type';

export function determineRequestTokenGrantType(
    request: ExpressRequest,
) : TokenGrantType | undefined {
    const { grant_type: grantType } = request.body;

    const validGrantTypes = Object.values(OAuth2AccessTokenGrant);
    if (validGrantTypes.indexOf(grantType) !== -1) {
        return grantType;
    }

    const { username, password } = request.body;

    if (username && password) {
        return OAuth2AccessTokenGrant.PASSWORD;
    }

    const { id, secret } = request.body;

    if (id && secret) {
        return OAuth2AccessTokenGrant.ROBOT_CREDENTIALS;
    }

    const { refresh_token: refreshToken } = request.body;

    if (refreshToken) {
        return OAuth2AccessTokenGrant.REFRESH_TOKEN;
    }

    return undefined;
}
