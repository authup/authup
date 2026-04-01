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
import type { IOAuth2KeyRepository } from '../../../../../../src/core/oauth2/key/types.ts';
import type { IOAuth2TokenRepository } from '../../../../../../src/core/oauth2/token/repository/types.ts';

vi.mock('@authup/server-kit', () => ({
    extractTokenHeader: vi.fn(),
    verifyToken: vi.fn(),
}));

function createKeyRepo(key: Key | null = null): IOAuth2KeyRepository {
    return {
        findByRealmId: vi.fn().mockResolvedValue(null),
        findById: vi.fn().mockResolvedValue(key),
    };
}

function createTokenRepo(
    overrides: Partial<IOAuth2TokenRepository> = {},
): IOAuth2TokenRepository {
    return {
        setInactive: vi.fn(),
        isInactive: vi.fn().mockResolvedValue(false),
        findOneById: vi.fn().mockResolvedValue(null),
        findOneBySignature: vi.fn().mockResolvedValue(null),
        removeById: vi.fn(),
        insert: vi.fn(),
        save: vi.fn(),
        saveWithSignature: vi.fn(),
        ...overrides,
    };
}

function createKey(type: string, overrides: Partial<Key> = {}): Key {
    return {
        id: randomUUID(),
        type,
        ...overrides,
    } as unknown as Key;
}

function createPayload(overrides: Partial<OAuth2TokenPayload> = {}): OAuth2TokenPayload {
    return {
        jti: randomUUID(),
        sub: 'u1',
        ...overrides, 
    } as OAuth2TokenPayload;
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
            const tokenRepo = createTokenRepo({ isInactive: vi.fn().mockResolvedValue(true) });
            const verifier = new OAuth2TokenVerifier(createKeyRepo(), tokenRepo);

            expect(await verifier.isInactive('some-jti')).toBe(true);
            expect(tokenRepo.isInactive).toHaveBeenCalledWith('some-jti');
        });
    });

    describe('verify - cache path', () => {
        it('should return cached payload when found by signature', async () => {
            const payload = createPayload();
            const tokenRepo = createTokenRepo({ findOneBySignature: vi.fn().mockResolvedValue(payload) });
            const verifier = new OAuth2TokenVerifier(createKeyRepo(), tokenRepo);

            const result = await verifier.verify('cached-token');
            expect(result).toBe(payload);
            expect(tokenRepo.findOneBySignature).toHaveBeenCalledWith('cached-token');
        });

        it('should throw JWTError when cached payload has no jti', async () => {
            const tokenRepo = createTokenRepo({ findOneBySignature: vi.fn().mockResolvedValue({ sub: 'u1' } as OAuth2TokenPayload) });
            const verifier = new OAuth2TokenVerifier(createKeyRepo(), tokenRepo);

            await expect(verifier.verify('cached-token')).rejects.toThrow(JWTError);
        });

        it('should throw JWTError when cached token is inactive', async () => {
            const tokenRepo = createTokenRepo({
                findOneBySignature: vi.fn().mockResolvedValue(createPayload()),
                isInactive: vi.fn().mockResolvedValue(true),
            });
            const verifier = new OAuth2TokenVerifier(createKeyRepo(), tokenRepo);

            await expect(verifier.verify('cached-token')).rejects.toThrow(JWTError);
        });

        it('should skip active check when skipActiveCheck is true', async () => {
            const payload = createPayload();
            const tokenRepo = createTokenRepo({
                findOneBySignature: vi.fn().mockResolvedValue(payload),
                isInactive: vi.fn().mockResolvedValue(true),
            });
            const verifier = new OAuth2TokenVerifier(createKeyRepo(), tokenRepo);

            expect(await verifier.verify('cached-token', { skipActiveCheck: true })).toBe(payload);
            expect(tokenRepo.isInactive).not.toHaveBeenCalled();
        });
    });

    describe('verify - crypto path', () => {
        it('should throw JWTError when header has no kid', async () => {
            extractTokenHeader.mockReturnValue({});
            const verifier = new OAuth2TokenVerifier(createKeyRepo(), createTokenRepo());

            await expect(verifier.verify('raw-token')).rejects.toThrow(JWTError);
        });

        it('should throw JWKError when key not found by kid', async () => {
            extractTokenHeader.mockReturnValue({ kid: 'unknown-key-id' });
            const verifier = new OAuth2TokenVerifier(createKeyRepo(), createTokenRepo());

            await expect(verifier.verify('raw-token')).rejects.toThrow(JWKError);
        });

        it('should verify OCT token and cache result', async () => {
            const payload = createPayload();
            const key = createKey(JWKType.OCT, { decryption_key: 'secret' } as any);
            const tokenRepo = createTokenRepo();
            extractTokenHeader.mockReturnValue({ kid: key.id });
            verifyToken.mockResolvedValue(payload);

            const verifier = new OAuth2TokenVerifier(createKeyRepo(key), tokenRepo);
            expect(await verifier.verify('raw-token')).toBe(payload);
            expect(tokenRepo.saveWithSignature).toHaveBeenCalledWith(payload, 'raw-token');
        });

        it('should throw JWKError when OCT key has no decryption_key', async () => {
            const key = createKey(JWKType.OCT, { decryption_key: null } as any);
            extractTokenHeader.mockReturnValue({ kid: key.id });

            const verifier = new OAuth2TokenVerifier(createKeyRepo(key), createTokenRepo());
            await expect(verifier.verify('raw-token')).rejects.toThrow(JWKError);
        });

        it('should verify EC token using encryption_key', async () => {
            const payload = createPayload();
            const key = createKey(JWKType.EC, {
                encryption_key: 'ec-public-key',
                signature_algorithm: 'ES256', 
            } as any);
            extractTokenHeader.mockReturnValue({ kid: key.id });
            verifyToken.mockResolvedValue(payload);

            const verifier = new OAuth2TokenVerifier(createKeyRepo(key), createTokenRepo());
            expect(await verifier.verify('raw-token')).toBe(payload);
        });

        it('should throw JWKError when EC key has no encryption_key', async () => {
            const key = createKey(JWKType.EC, { encryption_key: null } as any);
            extractTokenHeader.mockReturnValue({ kid: key.id });

            const verifier = new OAuth2TokenVerifier(createKeyRepo(key), createTokenRepo());
            await expect(verifier.verify('raw-token')).rejects.toThrow(JWKError);
        });

        it('should verify RSA token (default branch)', async () => {
            const payload = createPayload();
            const key = createKey(JWKType.RSA, {
                encryption_key: 'rsa-public-key',
                signature_algorithm: 'RS256', 
            } as any);
            extractTokenHeader.mockReturnValue({ kid: key.id });
            verifyToken.mockResolvedValue(payload);

            const verifier = new OAuth2TokenVerifier(createKeyRepo(key), createTokenRepo());
            expect(await verifier.verify('raw-token')).toBe(payload);
        });

        it('should throw JWTError when verified payload has no jti', async () => {
            const key = createKey(JWKType.OCT, { decryption_key: 'secret' } as any);
            extractTokenHeader.mockReturnValue({ kid: key.id });
            verifyToken.mockResolvedValue({ sub: 'u1' } as OAuth2TokenPayload);

            const verifier = new OAuth2TokenVerifier(createKeyRepo(key), createTokenRepo());
            await expect(verifier.verify('raw-token')).rejects.toThrow(JWTError);
        });

        it('should check active status after crypto verification', async () => {
            const key = createKey(JWKType.OCT, { decryption_key: 'secret' } as any);
            const tokenRepo = createTokenRepo({ isInactive: vi.fn().mockResolvedValue(true) });
            extractTokenHeader.mockReturnValue({ kid: key.id });
            verifyToken.mockResolvedValue(createPayload());

            const verifier = new OAuth2TokenVerifier(createKeyRepo(key), tokenRepo);
            await expect(verifier.verify('raw-token')).rejects.toThrow(JWTError);
            expect(tokenRepo.saveWithSignature).toHaveBeenCalled();
        });

        it('should skip active check in crypto path when skipActiveCheck is true', async () => {
            const payload = createPayload();
            const key = createKey(JWKType.OCT, { decryption_key: 'secret' } as any);
            const tokenRepo = createTokenRepo({ isInactive: vi.fn().mockResolvedValue(true) });
            extractTokenHeader.mockReturnValue({ kid: key.id });
            verifyToken.mockResolvedValue(payload);

            const verifier = new OAuth2TokenVerifier(createKeyRepo(key), tokenRepo);
            expect(await verifier.verify('raw-token', { skipActiveCheck: true })).toBe(payload);
            expect(tokenRepo.isInactive).not.toHaveBeenCalled();
        });
    });
});
