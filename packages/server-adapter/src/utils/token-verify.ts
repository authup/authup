/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RedisCache } from 'redis-extension';
import { TokenAPI, TokenInvalidError, TokenVerificationPayload } from '@typescript-auth/domains';
import { TokenExpiredError } from '@typescript-auth/domains/src/error/entities/token-expired';

export type TokenVerifyContext = {
    token: string,
    tokenAPIClient: TokenAPI,
    tokenCache?: RedisCache<string>
};

export async function verifyToken(context: TokenVerifyContext) : Promise<TokenVerificationPayload> {
    let data : TokenVerificationPayload | undefined;

    if (context.tokenCache) {
        data = await context.tokenCache.get(context.token);
    }

    if (!data) {
        let payload : TokenVerificationPayload;

        try {
            payload = await context.tokenAPIClient.verify(context.token);
        } catch (e) {
            throw new TokenInvalidError({
                statusCode: e.response.status,
                code: e.response.data.code,
                message: e.response.data.message,
            });
        }

        let secondsDiff : number = payload.token.exp - (new Date().getTime() / 1000);
        secondsDiff = parseInt(secondsDiff.toString(), 10);

        if (secondsDiff <= 0) {
            throw new TokenExpiredError();
        }

        if (context.tokenCache) {
            await context.tokenCache.set(context.token, payload, { seconds: secondsDiff });
        }

        data = payload;
    }

    return data;
}
