/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Cache } from 'redis-extension';
import {
    TokenAPI, TokenExpiredError, TokenInvalidError, TokenVerificationPayload,
} from '@typescript-auth/domains';

export type TokenVerifyContext = {
    token: string,
    tokenAPIClient: TokenAPI,
    tokenCache?: Cache<string>
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

        let secondsDiff : number = payload.token.expire_time - (new Date().getTime() / 1000);
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
