/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Client,
    ClientAuthenticationHook,
} from '@authup/core-http-kit';
import { ErrorCode } from '@authup/errors';
import { isObject } from '@authup/kit';
import {
    JWKType,
    JWTError,
} from '@authup/specs';
import type {
    JWTAlgorithm,
    OAuth2JsonWebKey,
    OAuth2TokenIntrospectionResponse,
    OAuth2TokenPayload,
} from '@authup/specs';
import {
    extractTokenHeader,
    verifyToken,
} from '@authup/server-kit';
import { importJWK } from 'jose';
import type { ITokenVerifierCache } from './cache';
import type {
    ITokenVerifier, 
    TokenVerificationData, 
    TokenVerificationDataInput, 
    TokenVerifierContext,
} from './types';

export class TokenVerifier implements ITokenVerifier {
    protected interceptorMounted : boolean | undefined;

    protected client: Client;

    protected cache : ITokenVerifierCache | undefined;

    protected maxRemoteCacheTTL: number | undefined;

    constructor(ctx: TokenVerifierContext) {
        this.cache = ctx.cache;
        this.maxRemoteCacheTTL = ctx.maxRemoteCacheTTL;
        this.client = new Client({
            baseURL: ctx.baseURL 
        });

        if (ctx.creator) {
            // todo: use server kit singleton :)
            const hook = new ClientAuthenticationHook({
                tokenCreator: ctx.creator,
                baseURL: ctx.baseURL,
            });

            hook.attach(this.client);

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
        let output: TokenVerificationData | undefined;
        if (this.cache) {
            output = await this.cache.get(token);
            if (output) {
                return output;
            }
        }

        const header = extractTokenHeader(token);
        if (!header) {
            throw JWTError.headerInvalid('The token header could not be extracted.');
        }

        if (!header.kid) {
            throw JWTError.headerPropertyInvalid('kid');
        }

        let jwk : OAuth2JsonWebKey;

        try {
            // todo: this should be cached as well :)
            jwk = await this.client.getJwk(header.kid);
        } catch (e) {
            if (isObject(e) && isObject(e.response) && e.response.status === 404) {
                throw JWTError.payloadPropertyInvalid('kid');
            }

            throw new JWTError({
                message: 'Failed to fetch JWK from auth server.',
                cause: e as Error,
            });
        }

        const key = await importJWK(jwk);

        /* istanbul ignore next */
        if (!(key instanceof CryptoKey)) {
            throw JWTError.payloadInvalid('The jwt key is not valid.');
        }

        let payload : OAuth2TokenPayload;

        // todo: get jwk type for algorithm

        try {
            payload = await verifyToken(token, {
                type: JWKType.RSA,
                key,
                ...(jwk.alg ? {
                    algorithms: [jwk.alg as JWTAlgorithm.RS256] 
                } : {}),
            }) as OAuth2TokenPayload;
        } catch {
            throw JWTError.payloadInvalid('The token could not be verified.');
        }

        const secondsDiff = this.getTokenExpiresIn(payload);

        output = this.transform(payload);

        if (this.cache) {
            await this.cache.set(token, output, secondsDiff);
        }

        return output;
    }

    async verifyRemote(token: string) : Promise<TokenVerificationData> {
        let output: TokenVerificationData | undefined;
        if (this.cache) {
            output = await this.cache.get(token);
            if (output) {
                return output;
            }
        }

        let payload : OAuth2TokenIntrospectionResponse;

        try {
            payload = await this.client.token.introspect({
                token 
            }, {
                authorizationHeaderInherit: true,
            });
        } catch (e) {
            /* istanbul ignore next */
            if (!isObject(e)) {
                throw new JWTError({
                    message: 'An unexpected token occurred.',
                });
            }

            if (
                isObject(e.response) &&
                isObject(e.response.data)
            ) {
                const code = typeof e.response.data.code === 'string' ?
                    e.response.data.code :
                    ErrorCode.JWT_INVALID;

                const message = typeof e.response.data.message === 'string' ?
                    e.response.data.message :
                    undefined;

                throw new JWTError({
                    statusCode: e.response.status,
                    code,
                    message,
                });
            }

            /* istanbul ignore next */
            throw new JWTError({
                message: e.message || 'An unexpected error occurred.',
                cause: e as Error,
            });
        }

        if ('active' in payload && !payload.active) {
            throw JWTError.notActive();
        }

        const secondsDiff = this.getTokenExpiresIn(payload);
        const cacheTTL = this.maxRemoteCacheTTL ?
            Math.min(secondsDiff, this.maxRemoteCacheTTL) :
            secondsDiff;

        output = this.transform(payload);

        if (this.cache) {
            await this.cache.set(token, output, cacheTTL);
        }

        return output;
    }

    /**
     * Return remaining seconds until token expires.
     * Throw error if token is already expired.
     *
     * @param payload
     * @protected
     */
    protected getTokenExpiresIn(payload: OAuth2TokenPayload) : number {
        if (!payload.exp) {
            throw JWTError.payloadPropertyInvalid('exp');
        }

        const now = Math.floor(Date.now() / 1000);
        const secondsDiff = payload.exp - now;
        /* istanbul ignore next */
        if (secondsDiff <= 0) {
            throw JWTError.expired();
        }

        return secondsDiff;
    }

    protected transform(input: TokenVerificationDataInput) : TokenVerificationData {
        return {
            ...input,
            permissions: input.permissions || [],
        };
    }
}
