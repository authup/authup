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
import { isObject, isUUID } from '@authup/kit';
import {
    JWTError,
    OAuth2TokenKind,
} from '@authup/specs';
import type {
    OAuth2JsonWebKey,
    OAuth2TokenIntrospectionResponse,
    OAuth2TokenPayload,
} from '@authup/specs';
import type { JWTPayload, ProtectedHeaderParameters } from 'jose';
import {
    decodeJwt,
    decodeProtectedHeader,
    errors,
    importJWK,
    jwtVerify,
} from 'jose';
import { assertTokenCertificateBinding } from '../certificate-binding';
import type { IVerifierCache } from './cache';
import { MemoryVerifierCache } from './cache';
import { JWKResolver } from './jwk';
import type { JWKCacheData } from './jwk';
import type {
    ITokenVerifier,
    TokenVerificationData,
    TokenVerificationDataInput,
    TokenVerifierContext,
    TokenVerifyOptions,
} from './types';

// RFC 7515 compact serialization: three unpadded base64url segments.
const COMPACT_JWS_PATTERN = /^[\w-]+\.[\w-]+\.[\w-]+$/;

export class TokenVerifier implements ITokenVerifier {
    protected interceptorMounted : boolean | undefined;

    protected client: Client;

    protected cache : IVerifierCache | undefined;

    protected maxRemoteCacheTTL: number | undefined;

    protected jwkResolver: JWKResolver | undefined;

    constructor(ctx: TokenVerifierContext) {
        this.cache = ctx.cache;
        this.jwkResolver = ctx.jwkCache === false ?
            undefined :
            new JWKResolver(ctx.cache ?? new MemoryVerifierCache(), ctx.jwkCache);
        this.maxRemoteCacheTTL = ctx.maxRemoteCacheTTL;
        this.client = new Client({ baseURL: ctx.baseURL });

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
        const output = await this.resolveLocal(token);
        await this.assertCertificateBinding(output, options);
        // never expose the cache-owned object: a caller mutating its result
        // (e.g. stripping cnf) must not poison later cache hits.
        return structuredClone(output);
    }

    async verifyRemote(token: string, options: TokenVerifyOptions = {}) : Promise<TokenVerificationData> {
        const output = await this.resolveRemote(token);
        await this.assertCertificateBinding(output, options);
        return structuredClone(output);
    }

    protected async resolveLocal(token: string) : Promise<TokenVerificationData> {
        // jose's base64url decoding ignores whitespace and accepts padding,
        // and the signature segment is not covered by the signature, so
        // without this one valid token yields endlessly many accepted
        // strings, each a fresh verification and cache entry.
        if (!COMPACT_JWS_PATTERN.test(token)) {
            throw JWTError.invalid();
        }

        let output: TokenVerificationData | undefined;
        if (this.cache) {
            output = await this.cache.getToken(token);
            if (output) {
                return output;
            }
        }

        let header : ProtectedHeaderParameters;
        try {
            header = decodeProtectedHeader(token);
        } catch {
            throw JWTError.headerInvalid('The token header could not be extracted.');
        }

        if (!header.kid || !isUUID(header.kid)) {
            throw JWTError.headerPropertyInvalid('kid');
        }

        // uuids compare case-insensitively (isUUID and the server's lookup),
        // so each case variant would otherwise be its own cache entry: one
        // upstream fetch per variant and an easy way to evict real keys.
        const kid = header.kid.toLowerCase();

        // The key is read from the realm the token names, so a key of
        // another realm can never verify it; the signature check below then
        // proves the claim it was looked up by.
        let claims : JWTPayload;
        try {
            claims = decodeJwt(token);
        } catch {
            throw JWTError.payloadInvalid('The token payload could not be extracted.');
        }

        const { realm_id: realmClaim } = claims;
        if (typeof realmClaim !== 'string' || !realmClaim) {
            throw JWTError.payloadPropertyInvalid('realm_id');
        }

        const realmId = isUUID(realmClaim) ? realmClaim.toLowerCase() : realmClaim;

        const entry = this.jwkResolver ?
            await this.jwkResolver.resolve({ realmId, kid }, () => this.loadJwk(kid, realmId)) :
            await this.loadJwk(kid, realmId);

        let payload : OAuth2TokenPayload;

        try {
            // 60 seconds is the leeway @node-rs/jsonwebtoken applied, so an
            // issuer whose clock runs slightly ahead still passes nbf.
            const result = await jwtVerify(token, entry.key, {
                clockTolerance: 60,
                ...(entry.algorithm ? { algorithms: [entry.algorithm] } : {}),
            });
            payload = result.payload as OAuth2TokenPayload;
        } catch (e) {
            if (e instanceof errors.JWTExpired) {
                throw JWTError.expired();
            }

            throw JWTError.payloadInvalid('The token could not be verified.');
        }

        const secondsDiff = this.getTokenExpiresIn(payload);

        output = this.transform(payload);

        if (this.cache) {
            await this.cache.setToken(token, output, secondsDiff);
        }

        return output;
    }

    protected async loadJwk(kid: string, realmId: string) : Promise<JWKCacheData> {
        let jwk : OAuth2JsonWebKey;

        try {
            jwk = await this.client.getJwk(kid, realmId);
        } catch (e) {
            if (isObject(e) && isObject(e.response) && e.response.status === 404) {
                throw JWTError.payloadPropertyInvalid('kid');
            }

            throw new JWTError({
                message: 'Failed to fetch JWK from auth server.',
                cause: e as Error,
            });
        }

        let key : CryptoKey | Uint8Array;
        try {
            key = await importJWK(jwk);
        } catch {
            throw JWTError.payloadInvalid('The jwt key is not valid.');
        }

        /* istanbul ignore next */
        if (!(key instanceof CryptoKey)) {
            throw JWTError.payloadInvalid('The jwt key is not valid.');
        }

        // jose refuses to verify with an RSA key under 2048 bits.
        const { modulusLength } = key.algorithm as Partial<RsaHashedKeyAlgorithm>;
        if (typeof modulusLength === 'number' && modulusLength < 2048) {
            throw JWTError.payloadInvalid(
                `The jwt key is ${modulusLength} bits; RSA keys must be 2048 bits or larger.`,
            );
        }

        return { key, algorithm: jwk.alg };
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
