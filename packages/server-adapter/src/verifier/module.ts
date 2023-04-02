/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    AbilityDescriptor,
    OAuth2JsonWebKey,
    OAuth2TokenIntrospectionResponse,
    OAuth2TokenPayload,
} from '@authup/core';
import {
    APIClient,
    AbilityManager,
    ErrorCode,
    KeyType,
    OAuth2SubKind,
    TokenError,
    isObject,
} from '@authup/core';
import { decodeToken, verifyToken } from '@authup/server-core';
import type { TokenVerifyRSAlgorithm } from '@authup/server-core';
import { KeyObject } from 'node:crypto';
import { importJWK } from 'jose';
import { mountTokenInterceptorForClient } from '../interceptor';
import { TokenVerifierMemoryCache, TokenVerifierRedisCache } from './cache';
import type { TokenVerifierCache } from './cache';
import type { TokenVerifierOptions, TokenVerifierOutput } from './type';

export class TokenVerifier {
    protected interceptorId : number | undefined;

    protected client: APIClient;

    protected cache : TokenVerifierCache;

    constructor(context: TokenVerifierOptions) {
        /* istanbul ignore next */
        if (context.cache && context.cache.type === 'redis') {
            this.cache = new TokenVerifierRedisCache(context.cache.client);
        } else {
            this.cache = new TokenVerifierMemoryCache();
        }

        this.client = new APIClient({ driver: { baseURL: context.baseUrl } });

        if (context.creator) {
            if (
                typeof context.creator !== 'function' &&
                typeof context.creator.baseUrl === 'undefined'
            ) {
                context.creator.baseUrl = context.baseUrl;
            }

            this.interceptorId = mountTokenInterceptorForClient(this.client, {
                tokenCreator: context.creator,
                baseUrl: context.baseUrl,
            });
        }
    }

    async verify(token: string) : Promise<TokenVerifierOutput> {
        if (typeof this.interceptorId === 'number') {
            return this.verifyRemote(token);
        }

        return this.verifyLocal(token);
    }

    async verifyLocal(token: string) : Promise<TokenVerifierOutput> {
        let output = await this.cache.get(token);
        if (output) {
            return output;
        }

        const tokenDecoded = decodeToken(token, { complete: true });
        if (!tokenDecoded) {
            throw TokenError.payloadInvalid('The token could not be decoded.');
        }

        let jwk : OAuth2JsonWebKey;

        try {
            jwk = await this.client.getJwk(tokenDecoded.header.kid);
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
                type: KeyType.RSA,
                keyPair: {
                    publicKey: Buffer.isBuffer(publicKey) ?
                        publicKey.toString('utf-8') :
                        publicKey,
                },
                ...(jwk.alg ? { algorithms: [jwk.alg as TokenVerifyRSAlgorithm] } : {}),
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

    async verifyRemote(token: string) : Promise<TokenVerifierOutput> {
        let output = await this.cache.get(token);
        if (output) {
            return output;
        }

        let payload : OAuth2TokenIntrospectionResponse;

        try {
            payload = await this.client.token.introspect(token);
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
                previous: e as Error,
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

    protected transform(
        input: {
            realm_id?: string,
            realm_name?: string,
            sub_kind?: string,
            sub?: string,
            sub_name?: string,
            permissions?: AbilityDescriptor[]
        },
    ) {
        const output : TokenVerifierOutput = {
            realmId: input.realm_id,
            realmName: input.realm_name,
            ability: new AbilityManager(input.permissions || []),
        };
        switch (input.sub_kind) {
            case OAuth2SubKind.USER: {
                output.userId = input.sub;
                output.userName = input.sub_name;
                output.user = { name: output.userName, id: output.userId };
                break;
            }
            /* istanbul ignore next */
            case OAuth2SubKind.CLIENT: {
                output.clientId = input.sub;
                output.clientName = input.sub_name;
                output.client = { name: output.clientName, id: output.clientId };
                break;
            }
            /* istanbul ignore next */
            case OAuth2SubKind.ROBOT: {
                output.robotId = input.sub;
                output.robotName = input.sub_name;
                output.robot = { name: output.robotName, id: output.robotId };
            }
        }

        return output;
    }
}
