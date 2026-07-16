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
import { Faker } from '../utils';

describe('verifier', () => {
    let token : string;
    let mfaToken : string;
    let boundToken : string;
    beforeAll(async () => {
        const faker = new Faker();

        token = await faker.sign(TokenPayload);
        mfaToken = await faker.sign({
            ...TokenPayload,
            kind: OAuth2TokenKind.MFA,
        });
        boundToken = await faker.sign(BoundTokenPayload);

        vitest.spyOn(TokenAPI.prototype, 'introspect').mockImplementation((options) => introspectToken(options));
        vitest.spyOn(Client.prototype, 'getJwk').mockReturnValue(faker.useJwk());
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
});
