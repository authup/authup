/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2TokenGrantResponse, OAuth2TokenPayload, TokenError,
} from '@authup/common';
import { KeyEntity, signOAuth2TokenWithKey, useKey } from '@authup/server-database';
import { OAuth2BearerResponseBuildContext } from './type';

export async function buildOAuth2BearerTokenResponse(
    context: OAuth2BearerResponseBuildContext,
) {
    const accessTokenMaxAge : number = context.accessTokenMaxAge || 7200;

    const getRealmId = () : string | undefined => {
        if (context.realmId) {
            return context.realmId;
        }

        if (typeof context.accessToken !== 'string') {
            return context.accessToken.realm_id;
        }

        if (
            context.refreshToken &&
            typeof context.refreshToken !== 'string'
        ) {
            return context.refreshToken.realm_id;
        }

        return context.idToken &&
            typeof context.idToken !== 'string' ?
            context.idToken.realm_id :
            undefined;
    };

    let key : KeyEntity | undefined;

    const signToken = async (
        token: string | Partial<OAuth2TokenPayload>,
        maxAge?: number,
    ) : Promise<string> => {
        if (typeof token === 'string') {
            return token;
        }

        if (typeof key === 'undefined') {
            const realmId = getRealmId();
            if (!realmId) {
                throw TokenError.signingKeyMissing();
            }

            key = await useKey({ realm_id: realmId });
        }

        return signOAuth2TokenWithKey(
            token,
            key,
            {
                keyid: key.id,
                expiresIn: maxAge || accessTokenMaxAge,
            },
        );
    };

    const response : OAuth2TokenGrantResponse = {
        access_token: await signToken(context.accessToken),
        expires_in: accessTokenMaxAge,
        token_type: 'Bearer',
    };

    if (
        typeof context.accessToken !== 'string' &&
        context.accessToken.scope
    ) {
        response.scope = context.accessToken.scope;
    } else if (context.scope) {
        response.scope = context.scope;
    }

    if (context.refreshToken) {
        response.refresh_token = await signToken(context.refreshToken, context.refreshTokenMaxAge);
    }

    if (context.idToken) {
        response.id_token = await signToken(context.idToken, context.idTokenMaxAge);
    }

    return response;
}
