/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@authup/errors';
import { JWTError, OAuth2TokenKind } from '@authup/specs';
import {
    beforeAll, 
    beforeEach,
    describe, 
    expect, 
    it, 
    vitest,
} from 'vitest';
import { Client } from '@authup/core-http-kit';
import { TokenAPI } from '@hapic/oauth2';
import { MemoryTokenVerifierCache, TokenVerifier } from '../../src';
import {
    BoundTokenID,
    BoundTokenPayload,
    TokenCertificateThumbprint,
    TokenPayload,
    introspectToken,
} from '../data/token';
import { FAKER_KEY_ID, Faker } from '../utils';

describe('verifier', () => {
    let faker : Faker;
    let token : string;
    let mfaToken : string;
    let boundToken : string;
    let getJwk : ReturnType<typeof vitest.spyOn>;
    beforeAll(async () => {
        faker = new Faker();

        token = await faker.sign(TokenPayload);
        mfaToken = await faker.sign({
            ...TokenPayload,
            kind: OAuth2TokenKind.MFA,
        });
        boundToken = await faker.sign(BoundTokenPayload);

        vitest.spyOn(TokenAPI.prototype, 'introspect').mockImplementation((options) => introspectToken(options));
        getJwk = vitest.spyOn(Client.prototype, 'getJwk').mockReturnValue(faker.useJwk());
    });

    it('should verify token local', async () => {
        const cache = new MemoryTokenVerifierCache();
        const tokenVerifier = new TokenVerifier({
            baseURL: 'http://localhost:3001',
            cache,
        });

        const output = await tokenVerifier.verify(token);
        expect(output).toBeDefined();

        const outputCached = await cache.get(token);
        expect(output).toEqual(outputCached);
    });

    it('should not verify token local', async () => {
        const tokenVerifier = new TokenVerifier({ baseURL: 'http://localhost:3001' });

        try {
            await tokenVerifier.verify(ErrorCode.JWT_INVALID);
            expect(false).toBe(true);
        } catch (e) {
            expect(e).toBeInstanceOf(JWTError);
        }
    });

    it('should resolve the key of the realm the token names', async () => {
        getJwk.mockClear();
        const tokenVerifier = new TokenVerifier({ baseURL: 'http://localhost:3001' });

        await tokenVerifier.verifyLocal(token);

        expect(getJwk).toHaveBeenCalledWith(FAKER_KEY_ID, TokenPayload.realm_id);
    });

    it('should not verify a token naming no realm local', async () => {
        getJwk.mockClear();
        const tokenVerifier = new TokenVerifier({ baseURL: 'http://localhost:3001' });
        const payload = { ...TokenPayload };
        delete payload.realm_id;

        await expect(tokenVerifier.verifyLocal(await faker.sign(payload)))
            .rejects.toBeInstanceOf(JWTError);
        expect(getJwk).not.toHaveBeenCalled();
    });

    it('should not fetch a key for a kid that is no uuid', async () => {
        getJwk.mockClear();
        const tokenVerifier = new TokenVerifier({ baseURL: 'http://localhost:3001' });

        await expect(tokenVerifier.verifyLocal(await faker.sign(TokenPayload, '../users')))
            .rejects.toBeInstanceOf(JWTError);
        expect(getJwk).not.toHaveBeenCalled();
    });

    // A bearer must be an ACCESS token: authup signs other kinds with the
    // same keys (refresh tokens, the MFA-pending login ticket) — a local-JWKS
    // adapter must never accept them as an authenticated subject.
    it('should not verify a non-access token kind local', async () => {
        const tokenVerifier = new TokenVerifier({ baseURL: 'http://localhost:3001' });

        try {
            await tokenVerifier.verifyLocal(mfaToken);
            expect(false).toBe(true);
        } catch (e) {
            expect(e).toBeInstanceOf(JWTError);
        }
    });

    it('should report an expired token as expired local', async () => {
        const now = Math.floor(Date.now() / 1000);
        const tokenVerifier = new TokenVerifier({ baseURL: 'http://localhost:3001' });
        const expired = await faker.sign({
            ...TokenPayload,
            iat: now - 7200,
            exp: now - 3600,
        });

        await expect(tokenVerifier.verifyLocal(expired)).rejects.toMatchObject({ code: ErrorCode.JWT_EXPIRED });
    });

    it('should verify token remote', async () => {
        const cache = new MemoryTokenVerifierCache();
        const tokenVerifier = new TokenVerifier({
            baseURL: 'http://localhost:3001',
            cache,
            creator: () => Promise.resolve({
                access_token: 'foo',
                expires_in: 3600,
                token_type: 'Bearer',
            }),
        });

        const output = await tokenVerifier.verify(token);
        expect(output).toBeDefined();

        const outputCached = await cache.get(token);
        expect(output).toEqual(outputCached);
    });

    it('should not verify token remote', async () => {
        const tokenVerifier = new TokenVerifier({
            baseURL: 'http://localhost:3001',
            creator: () => Promise.resolve({
                access_token: 'foo',
                expires_in: 3600,
                token_type: 'Bearer',
            }),
        });

        try {
            await tokenVerifier.verify(ErrorCode.JWT_INVALID);
            expect(false).toBe(true);
        } catch (e) {
            expect(e).toBeInstanceOf(JWTError);
        }
    });

    // RFC 8705: certificate binding is enforced inside verify() itself —
    // a direct caller bypassing the request/socket wrappers must never
    // accept a bound token without the presented certificate's thumbprint.
    describe('certificate binding', () => {
        it('should not verify a certificate-bound token without a thumbprint', async () => {
            const tokenVerifier = new TokenVerifier({ baseURL: 'http://localhost:3001' });

            await expect(tokenVerifier.verify(boundToken))
                .rejects.toBeInstanceOf(JWTError);
        });

        it('should not verify a certificate-bound token with a mismatched thumbprint', async () => {
            const tokenVerifier = new TokenVerifier({ baseURL: 'http://localhost:3001' });

            await expect(tokenVerifier.verify(boundToken, { certificateThumbprint: 'other-thumbprint' }))
                .rejects.toBeInstanceOf(JWTError);
        });

        it('should verify a certificate-bound token with a matching thumbprint value', async () => {
            const tokenVerifier = new TokenVerifier({ baseURL: 'http://localhost:3001' });

            const output = await tokenVerifier.verify(boundToken, { certificateThumbprint: TokenCertificateThumbprint });
            expect(output.cnf).toEqual({ 'x5t#S256': TokenCertificateThumbprint });
        });

        it('should resolve the thumbprint via an async provider', async () => {
            const tokenVerifier = new TokenVerifier({ baseURL: 'http://localhost:3001' });

            const certificateThumbprint = vitest.fn(async () => TokenCertificateThumbprint);
            const output = await tokenVerifier.verify(boundToken, { certificateThumbprint });

            expect(output).toBeDefined();
            expect(certificateThumbprint).toHaveBeenCalledOnce();
        });

        it('should not invoke the thumbprint provider for an unbound token', async () => {
            const tokenVerifier = new TokenVerifier({ baseURL: 'http://localhost:3001' });

            const certificateThumbprint = vitest.fn(() => TokenCertificateThumbprint);
            const output = await tokenVerifier.verify(token, { certificateThumbprint });

            expect(output).toBeDefined();
            expect(certificateThumbprint).not.toHaveBeenCalled();
        });

        // MemoryTokenVerifierCache retains object references — a caller
        // mutating its result (e.g. stripping cnf) must not poison the
        // cached entry and bypass the binding on later verifications.
        it('should not let a caller mutation of the result poison the cached entry', async () => {
            const cache = new MemoryTokenVerifierCache();
            const tokenVerifier = new TokenVerifier({
                baseURL: 'http://localhost:3001',
                cache,
            });

            const output = await tokenVerifier.verify(boundToken, { certificateThumbprint: TokenCertificateThumbprint });
            delete output.cnf;

            const cached = await cache.get(boundToken);
            expect(cached?.cnf).toEqual({ 'x5t#S256': TokenCertificateThumbprint });

            await expect(tokenVerifier.verify(boundToken))
                .rejects.toBeInstanceOf(JWTError);
        });

        // The binding is per-request evidence, not a property of the token
        // alone — a cached verification result must not bypass it.
        it('should enforce the binding on cache hits', async () => {
            const cache = new MemoryTokenVerifierCache();
            const tokenVerifier = new TokenVerifier({
                baseURL: 'http://localhost:3001',
                cache,
            });

            const output = await tokenVerifier.verify(boundToken, { certificateThumbprint: TokenCertificateThumbprint });
            expect(output).toEqual(await cache.get(boundToken));

            await expect(tokenVerifier.verify(boundToken))
                .rejects.toBeInstanceOf(JWTError);
        });

        it('should enforce the binding on remote introspection', async () => {
            const tokenVerifier = new TokenVerifier({
                baseURL: 'http://localhost:3001',
                creator: () => Promise.resolve({
                    access_token: 'foo',
                    expires_in: 3600,
                    token_type: 'Bearer',
                }),
            });

            await expect(tokenVerifier.verify(BoundTokenID))
                .rejects.toBeInstanceOf(JWTError);

            const output = await tokenVerifier.verify(BoundTokenID, { certificateThumbprint: TokenCertificateThumbprint });
            expect(output.cnf).toEqual({ 'x5t#S256': TokenCertificateThumbprint });
        });
    });

    describe('jwk cache', () => {
        const OTHER_KID = '7a2e5c3b-4d1f-4b6a-8c9e-0f1a2b3c4d5e';
        const OTHER_REALM = '8b3f6d4c-5e2a-4c7b-9d0f-1a2b3c4d5e6f';
        const notFound = Object.assign(new Error('not found'), { response: { status: 404 } });

        let verifier : TokenVerifier;

        beforeEach(() => {
            getJwk.mockClear();
            verifier = new TokenVerifier({ baseURL: 'http://localhost:3001' });
        });

        it('fetches a key once per realm and kid', async () => {
            await verifier.verifyLocal(token);
            await verifier.verifyLocal(await faker.sign(TokenPayload));

            expect(getJwk).toHaveBeenCalledTimes(1);
        });

        it('fetches per realm', async () => {
            await verifier.verifyLocal(token);
            await verifier.verifyLocal(await faker.sign({ ...TokenPayload, realm_id: OTHER_REALM }));

            expect(getJwk).toHaveBeenCalledTimes(2);
            expect(getJwk).toHaveBeenLastCalledWith(FAKER_KEY_ID, OTHER_REALM);
        });

        it('fetches a rotated kid', async () => {
            await verifier.verifyLocal(token);
            await verifier.verifyLocal(await faker.sign(TokenPayload, OTHER_KID));

            expect(getJwk).toHaveBeenCalledTimes(2);
            expect(getJwk).toHaveBeenLastCalledWith(OTHER_KID, TokenPayload.realm_id);
        });

        it('keys and fetches a kid case-insensitively', async () => {
            await verifier.verifyLocal(token);
            await verifier.verifyLocal(await faker.sign(TokenPayload, FAKER_KEY_ID.toUpperCase()));

            expect(getJwk).toHaveBeenCalledTimes(1);
            expect(getJwk).toHaveBeenCalledWith(FAKER_KEY_ID, TokenPayload.realm_id);
        });

        it('fetches a lower-cased kid', async () => {
            await verifier.verifyLocal(await faker.sign(TokenPayload, FAKER_KEY_ID.toUpperCase()));

            expect(getJwk).toHaveBeenCalledWith(FAKER_KEY_ID, TokenPayload.realm_id);
        });

        it('keys a realm id case-insensitively', async () => {
            await verifier.verifyLocal(token);
            await verifier.verifyLocal(await faker.sign({ ...TokenPayload, realm_id: TokenPayload.realm_id?.toUpperCase() }));

            expect(getJwk).toHaveBeenCalledTimes(1);
        });

        it('does not cache a 404', async () => {
            getJwk.mockRejectedValueOnce(notFound);

            await expect(verifier.verifyLocal(token)).rejects.toMatchObject({
                code: ErrorCode.JWT_INVALID,
                message: 'The token payload property kid is invalid.',
            });
            await expect(verifier.verifyLocal(token)).resolves.toBeDefined();
            expect(getJwk).toHaveBeenCalledTimes(2);
        });

        it('retries after a failed fetch', async () => {
            getJwk.mockRejectedValueOnce(new Error('ECONNRESET'));

            await expect(verifier.verifyLocal(token)).rejects.toBeInstanceOf(JWTError);
            await expect(verifier.verifyLocal(token)).resolves.toBeDefined();
            expect(getJwk).toHaveBeenCalledTimes(2);
        });

        it('does not refetch on a signature failure', async () => {
            await verifier.verifyLocal(token);

            const forged = await new Faker().sign(TokenPayload);
            await expect(verifier.verifyLocal(forged)).rejects.toBeInstanceOf(JWTError);
            await expect(verifier.verifyLocal(forged)).rejects.toBeInstanceOf(JWTError);

            expect(getJwk).toHaveBeenCalledTimes(1);
        });

        it('fetches per verify when disabled', async () => {
            const uncached = new TokenVerifier({ baseURL: 'http://localhost:3001', jwkCache: false });

            await uncached.verifyLocal(token);
            await uncached.verifyLocal(token);

            expect(getJwk).toHaveBeenCalledTimes(2);
        });
    });
});
