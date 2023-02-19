/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenIntrospectionResponse } from '@authup/common';
import {
    TokenError,
    hasOwnProperty,
} from '@authup/common';
import { isClientError } from 'hapic';
import { useOAuth2Client } from '../client';
import type { TokenVerifyContext } from './type';
import { useOAuth2TokenCache } from './cache';

export async function verifyOAuth2Token(token: string, context: TokenVerifyContext) : Promise<OAuth2TokenIntrospectionResponse> {
    const cache = useOAuth2TokenCache(context.redis, context.redisPrefix);

    let data : OAuth2TokenIntrospectionResponse | undefined;

    if (cache) {
        data = await cache.get(token);

        if (context.logger) {
            context.logger.info(`The token ${token} could be verified from cache.`);
        }
    }

    if (!data) {
        let payload : OAuth2TokenIntrospectionResponse;

        try {
            const oauth2Client = await useOAuth2Client(context.oauth2);
            payload = await oauth2Client.token.introspect(token);
            if (context.logger) {
                context.logger.info(`The token ${token} could be verified.`);
            }
        } catch (e) {
            if (
                isClientError(e) &&
                e.response &&
                e.response.data &&
                hasOwnProperty(e.response.data, 'code') &&
                hasOwnProperty(e.response.data, 'message')
            ) {
                if (context.logger) {
                    context.logger.debug(e.response.data.message as string, {
                        error: e,
                    });
                }

                throw new TokenError({
                    statusCode: e.response.status,
                    code: e.response.data.code as string | number,
                    message: e.response.data.message as string,
                });
            } else {
                if (context.logger) {
                    context.logger.debug(`The token ${token} could not be verified.`, {
                        error: e,
                    });
                }

                throw new TokenError({
                    previous: e,
                });
            }
        }

        let secondsDiff : number = payload.exp - payload.iat;
        secondsDiff = parseInt(secondsDiff.toString(), 10);

        if (secondsDiff <= 0) {
            throw TokenError.expired();
        }

        if (cache) {
            await cache.set(token, payload, { seconds: secondsDiff });
        }

        data = payload;
    }

    return data;
}
