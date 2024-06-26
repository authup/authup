/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/kit';
import { TokenError } from '@authup/kit';
import type { KeyEntity } from '../../../domains';
import { signOAuth2TokenWithKey, useKey } from '../../../domains';
import type { OAuth2BearerResponseBuildContext } from './type';

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

        if (typeof token.exp === 'undefined') {
            token.exp = Math.floor(new Date().getTime() / 1000) + (maxAge || accessTokenMaxAge);
        }

        return signOAuth2TokenWithKey(
            token,
            key,
            {
                keyId: key.id,
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
