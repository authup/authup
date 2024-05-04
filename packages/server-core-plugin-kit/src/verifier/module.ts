/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { KeyObject } from 'node:crypto';
import {
    Client,
    mountClientResponseErrorTokenHook,
} from '@authup/core-http-kit';
import {
    ErrorCode,
    JWKType,
    TokenError,
    isObject,
} from '@authup/kit';
import type {
    JWTAlgorithm,
    OAuth2JsonWebKey,
    OAuth2TokenIntrospectionResponse,
    OAuth2TokenPayload,
} from '@authup/kit';
import { extractTokenHeader, verifyToken } from '@authup/server-kit';
import { importJWK } from 'jose';
import { TokenVerifierMemoryCache, TokenVerifierRedisCache, isTokenVerifierCache } from './cache';
import type { TokenVerifierCache } from './cache';
import type { TokenVerificationData, TokenVerificationDataInput, TokenVerifierOptions } from './type';

export class TokenVerifier {
    protected interceptorMounted : boolean | undefined;

    protected client: Client;

    protected cache : TokenVerifierCache;

    constructor(context: TokenVerifierOptions) {
        let cache : TokenVerifierCache | undefined;

        if (context.cache) {
            if (isTokenVerifierCache(context.cache)) {
                this.cache = context.cache;
            } else if (context.cache.type === 'redis') {
                this.cache = new TokenVerifierRedisCache(context.cache.client);
            } else {
                this.cache = new TokenVerifierMemoryCache(context.cache.intervalMs);
            }
        }

        this.cache = cache || new TokenVerifierMemoryCache();

        this.client = new Client({ baseURL: context.baseURL });

        if (context.creator) {
            if (
                typeof context.creator !== 'function' &&
                typeof context.creator.baseURL === 'undefined'
            ) {
                context.creator.baseURL = context.baseURL;
            }

            mountClientResponseErrorTokenHook(this.client, {
                tokenCreator: context.creator,
                baseURL: context.baseURL,
            });

            this.interceptorMounted = true;
        }
    }

    async verify(token: string) : Promise<TokenVerificationData> {
        if (this.interceptorMounted) {
            return this.verifyRemote(token);
        }

        return this.verifyLocal(token);
    }

    async verifyLocal(token: string) : Promise<TokenVerificationData> {
        let output = await this.cache.get(token);
        if (output) {
            return output;
        }

        const header = extractTokenHeader(token);
        if (!header) {
            throw TokenError.payloadInvalid('The token could not be decoded.');
        }

        let jwk : OAuth2JsonWebKey;

        try {
            jwk = await this.client.getJwk(header.kid);
        } catch (e) {
            /* istanbul ignore next */
            throw TokenError.payloadInvalid('The jwt key id is invalid or not present.');
        }

        const keyObject = await importJWK(jwk);

        /* istanbul ignore next */
        if (!(keyObject instanceof KeyObject) || keyObject.type !== 'public') {
            throw TokenError.payloadInvalid('The jwt key is not valid.');
        }

        const publicKey = keyObject.export({
            format: 'pem',
            type: 'spki',
        });

        let payload : OAuth2TokenPayload;

        try {
            payload = await verifyToken(token, {
                type: JWKType.RSA,
                keyPair: {
                    publicKey: Buffer.isBuffer(publicKey) ?
                        publicKey.toString('utf-8') :
                        publicKey,
                },
                ...(jwk.alg ? { algorithms: [jwk.alg as JWTAlgorithm.RS256] } : {}),
            }) as OAuth2TokenPayload;
        } catch (e) {
            throw TokenError.payloadInvalid('The token could not be verified.');
        }

        const secondsDiff = payload.exp - payload.iat;
        if (secondsDiff <= 0) {
            throw TokenError.expired();
        }

        output = this.transform(payload);

        await this.cache.set(token, output, secondsDiff);

        return output;
    }

    async verifyRemote(token: string) : Promise<TokenVerificationData> {
        let output = await this.cache.get(token);
        if (output) {
            return output;
        }

        let payload : OAuth2TokenIntrospectionResponse;

        try {
            payload = await this.client.token.introspect({ token }, {
                authorizationHeaderInherit: true,
            });
        } catch (e) {
            /* istanbul ignore next */
            if (!isObject(e)) {
                throw new TokenError({
                    message: 'An unexpected token occurred.',
                });
            }

            if (
                isObject(e.response) &&
                isObject(e.response.data)
            ) {
                const code = typeof e.response.data.code === 'string' ?
                    e.response.data.code :
                    ErrorCode.TOKEN_INVALID;

                const message = typeof e.response.data.message === 'string' ?
                    e.response.data.message :
                    undefined;

                throw new TokenError({
                    statusCode: e.response.status,
                    code,
                    message,
                });
            }

            /* istanbul ignore next */
            throw new TokenError({
                message: e.message || 'An unexpected error occurred.',
                cause: e as Error,
            });
        }

        const secondsDiff = payload.exp - payload.iat;
        /* istanbul ignore next */
        if (secondsDiff <= 0) {
            throw TokenError.expired();
        }

        output = this.transform(payload);

        await this.cache.set(token, output, secondsDiff);

        return output;
    }

    protected transform(input: TokenVerificationDataInput) : TokenVerificationData {
        return {
            ...input,
            permissions: input.permissions || [],
        };
    }
}
