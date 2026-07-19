/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Key } from '@authup/core-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import { JWKError, JWKType, JWTError } from '@authup/specs';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { OAuth2TokenVerifier } from '../../../../../../src/core/oauth2/token/verifier/module.ts';
import { FakeKeyStore } from '../../../helpers/fake-key-store.ts';
import { FakeOAuth2TokenRepository } from '../../../helpers/fake-oauth2-token-repository.ts';

vi.mock('@authup/server-kit', () => ({
    extractTokenHeader: vi.fn(),
    verifyToken: vi.fn(),
}));

const TIMESTAMP = '2026-01-01T00:00:00.000Z';

function createKey(type: `${JWKType}`, overrides: Partial<Key> = {}): Key {
    const realmId = randomUUID();

    return {
        id: randomUUID(),
        name: 'sig-test',
        type,
        use: 'sig',
        status: 'active',
        signatureAlgorithm: 'RS256',
        priority: 0,
        decryptionKey: null,
        encryptionKey: null,
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
        realmId,
        realm: {
            id: realmId,
            name: 'master',
            displayName: null,
            description: null,
            builtIn: true,
            createdAt: TIMESTAMP,
            updatedAt: TIMESTAMP,
        },
        ...overrides,
    };
}

function createPayload(overrides: Partial<OAuth2TokenPayload> = {}): OAuth2TokenPayload {
    return {
        jti: randomUUID(),
        sub: 'u1',
        ...overrides,
    };
}

describe('OAuth2TokenVerifier', () => {
    let extractTokenHeader: ReturnType<typeof vi.fn>;
    let verifyToken: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();
        const serverKit = await import('@authup/server-kit');
        extractTokenHeader = serverKit.extractTokenHeader as ReturnType<typeof vi.fn>;
        verifyToken = serverKit.verifyToken as ReturnType<typeof vi.fn>;
    });

    describe('isInactive', () => {
        it('should delegate to token repository', async () => {
            const tokenRepo = new FakeOAuth2TokenRepository();
            await tokenRepo.setInactive('some-jti');
            const verifier = new OAuth2TokenVerifier(new FakeKeyStore(), tokenRepo);

            expect(await verifier.isInactive('some-jti')).toBe(true);
            expect(tokenRepo.isInactiveCalls).toContainEqual('some-jti');
        });
    });

    describe('verify - cache path', () => {
        it('should return cached payload when found by signature', async () => {
            const payload = createPayload();
            const tokenRepo = new FakeOAuth2TokenRepository();
            tokenRepo.seedSignature('cached-token', payload);
            const verifier = new OAuth2TokenVerifier(new FakeKeyStore(), tokenRepo);

            const result = await verifier.verify('cached-token');
            expect(result).toBe(payload);
            expect(tokenRepo.findOneBySignatureCalls).toContainEqual('cached-token');
        });

        it('should throw JWTError when cached payload has no jti', async () => {
            const tokenRepo = new FakeOAuth2TokenRepository();
            tokenRepo.seedSignature('cached-token', { sub: 'u1' });
            const verifier = new OAuth2TokenVerifier(new FakeKeyStore(), tokenRepo);

            await expect(verifier.verify('cached-token')).rejects.toThrow(JWTError);
        });

        it('should throw JWTError when cached token is inactive', async () => {
            const payload = createPayload();
            const tokenRepo = new FakeOAuth2TokenRepository();
            tokenRepo.seedSignature('cached-token', payload);
            await tokenRepo.setInactive(payload.jti!);
            const verifier = new OAuth2TokenVerifier(new FakeKeyStore(), tokenRepo);

            await expect(verifier.verify('cached-token')).rejects.toThrow(JWTError);
        });

        it('should skip active check when skipActiveCheck is true', async () => {
            const payload = createPayload();
            const tokenRepo = new FakeOAuth2TokenRepository();
            tokenRepo.seedSignature('cached-token', payload);
            await tokenRepo.setInactive(payload.jti!);
            const verifier = new OAuth2TokenVerifier(new FakeKeyStore(), tokenRepo);

            expect(await verifier.verify('cached-token', { skipActiveCheck: true })).toBe(payload);
            expect(tokenRepo.isInactiveCalls).toHaveLength(0);
        });
    });

    describe('verify - crypto path', () => {
        it('should throw JWTError when header has no kid', async () => {
            extractTokenHeader.mockReturnValue({});
            const verifier = new OAuth2TokenVerifier(new FakeKeyStore(), new FakeOAuth2TokenRepository());

            await expect(verifier.verify('raw-token')).rejects.toThrow(JWTError);
        });

        it('should throw JWKError when key not found by kid', async () => {
            extractTokenHeader.mockReturnValue({ kid: 'unknown-key-id' });
            const verifier = new OAuth2TokenVerifier(new FakeKeyStore(), new FakeOAuth2TokenRepository());

            await expect(verifier.verify('raw-token')).rejects.toThrow(JWKError);
        });

        it('should reject a token whose kid references an enc key (realm key store)', async () => {
            // the key store also holds at-rest encryption keys — a forged kid
            // pointing at one must never enter signature verification.
            const key = createKey(JWKType.OCT, { use: 'enc', decryptionKey: 'secret' });
            extractTokenHeader.mockReturnValue({ kid: key.id });

            const verifier = new OAuth2TokenVerifier(new FakeKeyStore(key), new FakeOAuth2TokenRepository());

            await expect(verifier.verify('raw-token')).rejects.toThrow(JWKError);
        });

        it('should reject a token whose kid references a DISABLED key (plan 071 lifecycle)', async () => {
            // disabled = neither signs nor verifies; passive keys still verify.
            const key = createKey(JWKType.OCT, { decryptionKey: 'secret', status: 'disabled' });
            extractTokenHeader.mockReturnValue({ kid: key.id });

            const verifier = new OAuth2TokenVerifier(new FakeKeyStore(key), new FakeOAuth2TokenRepository());

            await expect(verifier.verify('raw-token')).rejects.toThrow(JWKError);
        });

        it('should verify a token whose kid references a PASSIVE key', async () => {
            const payload = createPayload();
            const key = createKey(JWKType.OCT, { decryptionKey: 'secret', status: 'passive' });
            extractTokenHeader.mockReturnValue({ kid: key.id });
            verifyToken.mockResolvedValue(payload);

            const verifier = new OAuth2TokenVerifier(new FakeKeyStore(key), new FakeOAuth2TokenRepository());

            expect(await verifier.verify('raw-token')).toEqual(payload);
        });

        it('should verify OCT token and cache result', async () => {
            const payload = createPayload();
            const key = createKey(JWKType.OCT, { decryptionKey: 'secret' });
            const tokenRepo = new FakeOAuth2TokenRepository();
            extractTokenHeader.mockReturnValue({ kid: key.id });
            verifyToken.mockResolvedValue(payload);

            const verifier = new OAuth2TokenVerifier(new FakeKeyStore(key), tokenRepo);
            expect(await verifier.verify('raw-token')).toBe(payload);
            expect(tokenRepo.saveWithSignatureCalls).toContainEqual({ payload, signature: 'raw-token' });
        });

        it('should NOT populate the signature cache when ignoreExpiry is set', async () => {
            // Regression: an expired id_token_hint verified with ignoreExpiry must
            // not be re-cached — otherwise the cache-first branch (no exp re-check)
            // would report the expired token as valid/active for buildTTL's 1h
            // fallback, e.g. /token/introspect returning active:true (RFC 7662).
            const payload = createPayload({ exp: Math.floor(Date.now() / 1000) - 3600 });
            const key = createKey(JWKType.OCT, { decryptionKey: 'secret' });
            const tokenRepo = new FakeOAuth2TokenRepository();
            extractTokenHeader.mockReturnValue({ kid: key.id });
            verifyToken.mockResolvedValue(payload);

            const verifier = new OAuth2TokenVerifier(new FakeKeyStore(key), tokenRepo);
            expect(
                await verifier.verify('expired-hint', { ignoreExpiry: true, skipActiveCheck: true }),
            ).toBe(payload);

            expect(tokenRepo.saveWithSignatureCalls).toHaveLength(0);
            expect(await tokenRepo.findOneBySignature('expired-hint')).toBeNull();
        });

        it('should throw JWKError when OCT key has no decryption_key', async () => {
            const key = createKey(JWKType.OCT, { decryptionKey: null });
            extractTokenHeader.mockReturnValue({ kid: key.id });

            const verifier = new OAuth2TokenVerifier(new FakeKeyStore(key), new FakeOAuth2TokenRepository());
            await expect(verifier.verify('raw-token')).rejects.toThrow(JWKError);
        });

        it('should verify EC token using encryption_key', async () => {
            const payload = createPayload();
            const key = createKey(JWKType.EC, {
                encryptionKey: 'ec-public-key',
                signatureAlgorithm: 'ES256',
            });
            extractTokenHeader.mockReturnValue({ kid: key.id });
            verifyToken.mockResolvedValue(payload);

            const verifier = new OAuth2TokenVerifier(new FakeKeyStore(key), new FakeOAuth2TokenRepository());
            expect(await verifier.verify('raw-token')).toBe(payload);
        });

        it('should throw JWKError when EC key has no encryption_key', async () => {
            const key = createKey(JWKType.EC, { encryptionKey: null });
            extractTokenHeader.mockReturnValue({ kid: key.id });

            const verifier = new OAuth2TokenVerifier(new FakeKeyStore(key), new FakeOAuth2TokenRepository());
            await expect(verifier.verify('raw-token')).rejects.toThrow(JWKError);
        });

        it('should verify RSA token (default branch)', async () => {
            const payload = createPayload();
            const key = createKey(JWKType.RSA, {
                encryptionKey: 'rsa-public-key',
                signatureAlgorithm: 'RS256',
            });
            extractTokenHeader.mockReturnValue({ kid: key.id });
            verifyToken.mockResolvedValue(payload);

            const verifier = new OAuth2TokenVerifier(new FakeKeyStore(key), new FakeOAuth2TokenRepository());
            expect(await verifier.verify('raw-token')).toBe(payload);
        });

        it('should throw JWTError when verified payload has no jti', async () => {
            const key = createKey(JWKType.OCT, { decryptionKey: 'secret' });
            extractTokenHeader.mockReturnValue({ kid: key.id });
            verifyToken.mockResolvedValue({ sub: 'u1' });

            const verifier = new OAuth2TokenVerifier(new FakeKeyStore(key), new FakeOAuth2TokenRepository());
            await expect(verifier.verify('raw-token')).rejects.toThrow(JWTError);
        });

        it('should check active status after crypto verification', async () => {
            const payload = createPayload();
            const key = createKey(JWKType.OCT, { decryptionKey: 'secret' });
            const tokenRepo = new FakeOAuth2TokenRepository();
            await tokenRepo.setInactive(payload.jti!);
            extractTokenHeader.mockReturnValue({ kid: key.id });
            verifyToken.mockResolvedValue(payload);

            const verifier = new OAuth2TokenVerifier(new FakeKeyStore(key), tokenRepo);
            await expect(verifier.verify('raw-token')).rejects.toThrow(JWTError);
            expect(tokenRepo.saveWithSignatureCalls.length).toBeGreaterThan(0);
        });

        it('should skip active check in crypto path when skipActiveCheck is true', async () => {
            const payload = createPayload();
            const key = createKey(JWKType.OCT, { decryptionKey: 'secret' });
            const tokenRepo = new FakeOAuth2TokenRepository();
            await tokenRepo.setInactive(payload.jti!);
            extractTokenHeader.mockReturnValue({ kid: key.id });
            verifyToken.mockResolvedValue(payload);

            const verifier = new OAuth2TokenVerifier(new FakeKeyStore(key), tokenRepo);
            expect(await verifier.verify('raw-token', { skipActiveCheck: true })).toBe(payload);
            expect(tokenRepo.isInactiveCalls).toHaveLength(0);
        });
    });
});
