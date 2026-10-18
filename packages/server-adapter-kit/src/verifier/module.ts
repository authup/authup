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
    JWTError,
    OAuth2TokenKind,
} from '@authup/specs';
import type {
    OAuth2TokenIntrospectionResponse,
    OAuth2TokenPayload,
} from '@authup/specs';
import type { Verifier } from 'vouchly';
import { createVerifier, isCompactToken } from 'vouchly';
import { assertTokenCertificateBinding } from '../certificate-binding';
import type { IVerifierCache } from './cache';
import { toJWTError } from './error';
import { createAuthupIssuer } from './issuer';
import type {
    ITokenVerifier,
    TokenVerificationData,
    TokenVerificationDataInput,
    TokenVerifierContext,
    TokenVerifyOptions,
} from './types';

export class TokenVerifier implements ITokenVerifier {
    protected interceptorMounted : boolean | undefined;

    protected client: Client;

    protected cache : IVerifierCache | undefined;

    protected maxRemoteCacheTTL: number | undefined;

    protected verifier: Verifier;

    constructor(ctx: TokenVerifierContext) {
        this.cache = ctx.cache;
        this.maxRemoteCacheTTL = ctx.maxRemoteCacheTTL;
        this.client = new Client({ baseURL: ctx.baseURL });
        this.verifier = createVerifier({
            issuers: [
                createAuthupIssuer({
                    client: this.client,
                    jwkCache: ctx.jwkCache,
                }),
            ],
            cache: false,
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

    async verify(token: string, options: TokenVerifyOptions = {}) : Promise<TokenVerificationData> {
        if (this.interceptorMounted) {
            return this.verifyRemote(token, options);
        }

        return this.verifyLocal(token, options);
    }

    async verifyLocal(token: string, options: TokenVerifyOptions = {}) : Promise<TokenVerificationData> {
        // jose's base64url decoding ignores whitespace and accepts padding,
        // and the signature segment is not covered by the signature, so
        // without this one valid token yields endlessly many accepted
        // strings, each a fresh verification and cache entry.
        if (!isCompactToken(token)) {
            throw JWTError.invalid();
        }

        if (this.cache) {
            const cached = await this.cache.getToken(token);
            if (cached) {
                await this.assertCertificateBinding(cached, options);
                // never expose the cache-owned object: a caller mutating its
                // result (e.g. stripping cnf) must not poison later cache hits.
                return structuredClone(cached);
            }
        }

        let payload : OAuth2TokenPayload;
        try {
            const result = await this.verifier.verify(token, { certificateThumbprint: options.certificateThumbprint });
            payload = result.claims as OAuth2TokenPayload;
        } catch (e) {
            throw toJWTError(e);
        }

        // the clock leeway applies to nbf only: a token past its exp is
        // expired, whatever the leeway.
        const secondsDiff = this.getTokenExpiresIn(payload);

        const output = this.transform(payload);

        if (this.cache) {
            await this.cache.setToken(token, output, secondsDiff);
        }

        return structuredClone(output);
    }

    async verifyRemote(token: string, options: TokenVerifyOptions = {}) : Promise<TokenVerificationData> {
        const output = await this.resolveRemote(token);
        await this.assertCertificateBinding(output, options);
        return structuredClone(output);
    }

    protected async resolveRemote(token: string) : Promise<TokenVerificationData> {
        let output: TokenVerificationData | undefined;
        if (this.cache) {
            output = await this.cache.getToken(token);
            if (output) {
                return output;
            }
        }

        let payload : OAuth2TokenIntrospectionResponse;

        try {
            payload = await this.client.token.introspect({ token }, { authorizationHeaderInherit: true });
        } catch (e) {
            /* istanbul ignore next */
            if (!isObject(e)) {
                throw new JWTError({ message: 'An unexpected token occurred.' });
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
            await this.cache.setToken(token, output, cacheTTL);
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

    /**
     * RFC 8705: a certificate-bound token (`cnf.x5t#S256`) fails closed
     * unless the caller supplies the presented certificate's thumbprint.
     * Runs on every verify — cached results included, since the binding is
     * per-request evidence, not a property of the token alone.
     *
     * @protected
     */
    protected async assertCertificateBinding(
        data: TokenVerificationData,
        options: TokenVerifyOptions,
    ) : Promise<void> {
        if (!data.cnf) {
            return;
        }

        const thumbprint = typeof options.certificateThumbprint === 'function' ?
            await options.certificateThumbprint() :
            options.certificateThumbprint;

        assertTokenCertificateBinding(data, thumbprint);
    }

    protected transform(input: TokenVerificationDataInput) : TokenVerificationData {
        // A bearer must be an ACCESS token. Authup signs other token kinds
        // with the same keys (refresh tokens, the MFA-pending login ticket)
        // — without this gate a local-JWKS adapter would accept any of them
        // as an authenticated subject. Kind-less payloads pass (foreign /
        // legacy tokens the adapter may be pointed at).
        if (input.kind && input.kind !== OAuth2TokenKind.ACCESS) {
            throw JWTError.payloadPropertyInvalid('kind');
        }

        return {
            ...input,
            permissions: input.permissions || [],
        };
    }
}
