/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2TokenGrant } from '@authup/specs';
import { readRequestBody } from '@routup/basic/body';
import { useRequestQuery } from '@routup/basic/query';
import { AuthorizationHeaderType, parseAuthorizationHeader } from 'hapic';
import type { IRoutupEvent } from 'routup';

export async function guessOauth2GrantTypeByRequest(
    event: IRoutupEvent,
) : Promise<`${OAuth2TokenGrant}` | undefined> {
    const body = await readRequestBody(event);
    const query = useRequestQuery(event);

    const pick = (key: string): any => body?.[key] ?? query?.[key];

    const grantType = pick('grant_type');

    const validGrantTypes = Object.values(OAuth2TokenGrant);
    if (validGrantTypes.includes(grantType)) {
        return grantType;
    }

    const username = pick('username');
    const password = pick('password');

    if (username && password) {
        return OAuth2TokenGrant.PASSWORD;
    }

    // ------------------------------------------------------------------

    const robotId = pick('id');
    const robotSecret = pick('secret');

    if (robotId && robotSecret) {
        return OAuth2TokenGrant.ROBOT_CREDENTIALS;
    }

    // ------------------------------------------------------------------

    const refreshToken = pick('refresh_token');
    if (refreshToken) {
        return OAuth2TokenGrant.REFRESH_TOKEN;
    }

    // ------------------------------------------------------------------

    const code = pick('code');
    if (code) {
        return OAuth2TokenGrant.AUTHORIZATION_CODE;
    }

    // ------------------------------------------------------------------

    let clientId = pick('client_id');
    let clientSecret = pick('client_secret');

    if (!clientId && !clientSecret) {
        const headerValue = event.headers.get('authorization');

        if (headerValue) {
            const header = parseAuthorizationHeader(headerValue);

            if (header.type === AuthorizationHeaderType.BASIC) {
                clientId = header.username;
                clientSecret = header.password;
            }
        }
    }

    if (clientId && clientSecret) {
        return OAuth2TokenGrant.CLIENT_CREDENTIALS;
    }

    return undefined;
}
