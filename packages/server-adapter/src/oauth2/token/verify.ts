/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenIntrospectionResponse } from '@authup/common';
import {
    ErrorCode,
    TokenError,
} from '@authup/common';
import { isClientError } from 'hapic';
import { isObject } from 'routup';
import { useOAuth2Client } from '../client';
import type { TokenVerifyContext } from './type';

export async function verifyOAuth2Token(
    token: string,
    context: TokenVerifyContext,
) : Promise<OAuth2TokenIntrospectionResponse> {
    let data : OAuth2TokenIntrospectionResponse | undefined;

    if (context.cache) {
        data = await context.cache.get(token);
    }

    if (!data) {
        let payload : OAuth2TokenIntrospectionResponse;

        try {
            const oauth2Client = await useOAuth2Client(context.oauth2);

            payload = await oauth2Client.token.introspect(token);
        } catch (e) {
            if (
                isClientError(e) &&
                e.response &&
                isObject(e.response.data) &&
                typeof e.response.data.message === 'string'
            ) {
                if (context.logger) {
                    context.logger.warn(e.response.data.message, {
                        error: e,
                    });
                }

                const code = typeof e.response.data.code === 'string' ?
                    e.response.data.code :
                    ErrorCode.TOKEN_INVALID;

                throw new TokenError({
                    statusCode: e.response.status,
                    code,
                    message: e.response.data.message,
                });
            } else {
                if (context.logger) {
                    context.logger.warn(`The token ${token} could not be verified.`, {
                        error: isObject(e) && typeof e.message === 'string' ? e.message : e,
                    });
                }

                throw new TokenError({
                    message: 'An unexpected error occurred.',
                    previous: e,
                });
            }
        }

        let secondsDiff : number = payload.exp - payload.iat;
        secondsDiff = parseInt(secondsDiff.toString(), 10);

        if (secondsDiff <= 0) {
            throw TokenError.expired();
        }

        if (context.cache) {
            await context.cache.set(
                token,
                payload,
                {
                    seconds: secondsDiff,
                },
            );
        }

        data = payload;
    }

    return data;
}
