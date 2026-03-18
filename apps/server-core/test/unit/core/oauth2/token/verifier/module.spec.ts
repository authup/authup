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
    beforeEach, describe, expect, it, vi,
} from 'vitest';
import { OAuth2TokenVerifier } from '../../../../../../src/core/oauth2/token/verifier/module.ts';
import type { IOAuth2KeyRepository } from '../../../../../../src/core/oauth2/key/types.ts';
import type { IOAuth2TokenRepository } from '../../../../../../src/core/oauth2/token/repository/types.ts';

vi.mock('@authup/server-kit', () => ({
    extractTokenHeader: vi.fn(),
    verifyToken: vi.fn(),
}));

function createFakeKeyRepository(): IOAuth2KeyRepository {
    return {
        findByRealmId: vi.fn().mockResolvedValue(null),
        findById: vi.fn().mockResolvedValue(null),
    };
}

function createFakeTokenRepository(
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
            const tokenRepo = createFakeTokenRepository({
                isInactive: vi.fn().mockResolvedValue(true),
            });
            const verifier = new OAuth2TokenVerifier(createFakeKeyRepository(), tokenRepo);

            const result = await verifier.isInactive('some-jti');
            expect(result).toBe(true);
            expect(tokenRepo.isInactive).toHaveBeenCalledWith('some-jti');
        });
    });

    describe('verify - cache path', () => {
        it('should return cached payload when found by signature', async () => {
            const payload: OAuth2TokenPayload = {
                jti: randomUUID(),
                sub: randomUUID(),
            } as OAuth2TokenPayload;

            const tokenRepo = createFakeTokenRepository({
                findOneBySignature: vi.fn().mockResolvedValue(payload),
            });
            const verifier = new OAuth2TokenVerifier(createFakeKeyRepository(), tokenRepo);

            const result = await verifier.verify('cached-token');
            expect(result).toBe(payload);
            expect(tokenRepo.findOneBySignature).toHaveBeenCalledWith('cached-token');
        });

        it('should throw JWTError when cached payload has no jti', async () => {
            const payload: OAuth2TokenPayload = {
                sub: randomUUID(),
            } as OAuth2TokenPayload;

            const tokenRepo = createFakeTokenRepository({
                findOneBySignature: vi.fn().mockResolvedValue(payload),
            });
            const verifier = new OAuth2TokenVerifier(createFakeKeyRepository(), tokenRepo);

            await expect(verifier.verify('cached-token')).rejects.toThrow(JWTError);
        });

        it('should throw JWTError when cached token is inactive', async () => {
            const payload: OAuth2TokenPayload = {
                jti: randomUUID(),
                sub: randomUUID(),
            } as OAuth2TokenPayload;

            const tokenRepo = createFakeTokenRepository({
                findOneBySignature: vi.fn().mockResolvedValue(payload),
                isInactive: vi.fn().mockResolvedValue(true),
            });
            const verifier = new OAuth2TokenVerifier(createFakeKeyRepository(), tokenRepo);

            await expect(verifier.verify('cached-token')).rejects.toThrow(JWTError);
        });

        it('should skip active check when skipActiveCheck is true', async () => {
            const payload: OAuth2TokenPayload = {
                jti: randomUUID(),
                sub: randomUUID(),
            } as OAuth2TokenPayload;

            const tokenRepo = createFakeTokenRepository({
                findOneBySignature: vi.fn().mockResolvedValue(payload),
                isInactive: vi.fn().mockResolvedValue(true),
            });
            const verifier = new OAuth2TokenVerifier(createFakeKeyRepository(), tokenRepo);

            const result = await verifier.verify('cached-token', { skipActiveCheck: true });
            expect(result).toBe(payload);
            expect(tokenRepo.isInactive).not.toHaveBeenCalled();
        });
    });

    describe('verify - crypto path', () => {
        it('should throw JWTError when header has no kid', async () => {
            const tokenRepo = createFakeTokenRepository();
            extractTokenHeader.mockReturnValue({});

            const verifier = new OAuth2TokenVerifier(createFakeKeyRepository(), tokenRepo);
            await expect(verifier.verify('raw-token')).rejects.toThrow(JWTError);
        });

        it('should throw JWKError when key not found by kid', async () => {
            const tokenRepo = createFakeTokenRepository();
            extractTokenHeader.mockReturnValue({ kid: 'unknown-key-id' });

            const keyRepo = createFakeKeyRepository();
            const verifier = new OAuth2TokenVerifier(keyRepo, tokenRepo);

            await expect(verifier.verify('raw-token')).rejects.toThrow(JWKError);
        });

        it('should verify OCT token and cache result', async () => {
            const jti = randomUUID();
            const keyId = randomUUID();
            const verifiedPayload: OAuth2TokenPayload = { jti, sub: 'u1' } as OAuth2TokenPayload;

            const tokenRepo = createFakeTokenRepository();
            extractTokenHeader.mockReturnValue({ kid: keyId });
            verifyToken.mockResolvedValue(verifiedPayload);

            const key = {
                id: keyId,
                type: JWKType.OCT,
                decryption_key: 'secret',
                encryption_key: null,
            } as unknown as Key;
            const keyRepo: IOAuth2KeyRepository = {
                findByRealmId: vi.fn(),
                findById: vi.fn().mockResolvedValue(key),
            };

            const verifier = new OAuth2TokenVerifier(keyRepo, tokenRepo);
            const result = await verifier.verify('raw-token');

            expect(result).toBe(verifiedPayload);
            expect(tokenRepo.saveWithSignature).toHaveBeenCalledWith(verifiedPayload, 'raw-token');
        });

        it('should throw JWKError when OCT key has no decryption_key', async () => {
            const keyId = randomUUID();
            const tokenRepo = createFakeTokenRepository();
            extractTokenHeader.mockReturnValue({ kid: keyId });

            const key = {
                id: keyId,
                type: JWKType.OCT,
                decryption_key: null,
            } as unknown as Key;
            const keyRepo: IOAuth2KeyRepository = {
                findByRealmId: vi.fn(),
                findById: vi.fn().mockResolvedValue(key),
            };

            const verifier = new OAuth2TokenVerifier(keyRepo, tokenRepo);
            await expect(verifier.verify('raw-token')).rejects.toThrow(JWKError);
        });

        it('should verify EC token using encryption_key', async () => {
            const jti = randomUUID();
            const keyId = randomUUID();
            const verifiedPayload: OAuth2TokenPayload = { jti, sub: 'u1' } as OAuth2TokenPayload;

            const tokenRepo = createFakeTokenRepository();
            extractTokenHeader.mockReturnValue({ kid: keyId });
            verifyToken.mockResolvedValue(verifiedPayload);

            const key = {
                id: keyId,
                type: JWKType.EC,
                encryption_key: 'ec-public-key',
                signature_algorithm: 'ES256',
            } as unknown as Key;
            const keyRepo: IOAuth2KeyRepository = {
                findByRealmId: vi.fn(),
                findById: vi.fn().mockResolvedValue(key),
            };

            const verifier = new OAuth2TokenVerifier(keyRepo, tokenRepo);
            const result = await verifier.verify('raw-token');
            expect(result).toBe(verifiedPayload);
        });

        it('should throw JWKError when EC key has no encryption_key', async () => {
            const keyId = randomUUID();
            const tokenRepo = createFakeTokenRepository();
            extractTokenHeader.mockReturnValue({ kid: keyId });

            const key = {
                id: keyId,
                type: JWKType.EC,
                encryption_key: null,
            } as unknown as Key;
            const keyRepo: IOAuth2KeyRepository = {
                findByRealmId: vi.fn(),
                findById: vi.fn().mockResolvedValue(key),
            };

            const verifier = new OAuth2TokenVerifier(keyRepo, tokenRepo);
            await expect(verifier.verify('raw-token')).rejects.toThrow(JWKError);
        });

        it('should verify RSA token (default branch)', async () => {
            const jti = randomUUID();
            const keyId = randomUUID();
            const verifiedPayload: OAuth2TokenPayload = { jti, sub: 'u1' } as OAuth2TokenPayload;

            const tokenRepo = createFakeTokenRepository();
            extractTokenHeader.mockReturnValue({ kid: keyId });
            verifyToken.mockResolvedValue(verifiedPayload);

            const key = {
                id: keyId,
                type: JWKType.RSA,
                encryption_key: 'rsa-public-key',
                signature_algorithm: 'RS256',
            } as unknown as Key;
            const keyRepo: IOAuth2KeyRepository = {
                findByRealmId: vi.fn(),
                findById: vi.fn().mockResolvedValue(key),
            };

            const verifier = new OAuth2TokenVerifier(keyRepo, tokenRepo);
            const result = await verifier.verify('raw-token');
            expect(result).toBe(verifiedPayload);
        });

        it('should throw JWTError when verified payload has no jti', async () => {
            const keyId = randomUUID();
            const tokenRepo = createFakeTokenRepository();
            extractTokenHeader.mockReturnValue({ kid: keyId });
            verifyToken.mockResolvedValue({ sub: 'u1' } as OAuth2TokenPayload);

            const key = {
                id: keyId,
                type: JWKType.OCT,
                decryption_key: 'secret',
            } as unknown as Key;
            const keyRepo: IOAuth2KeyRepository = {
                findByRealmId: vi.fn(),
                findById: vi.fn().mockResolvedValue(key),
            };

            const verifier = new OAuth2TokenVerifier(keyRepo, tokenRepo);
            await expect(verifier.verify('raw-token')).rejects.toThrow(JWTError);
        });

        it('should check active status after crypto verification', async () => {
            const jti = randomUUID();
            const keyId = randomUUID();
            const verifiedPayload: OAuth2TokenPayload = { jti, sub: 'u1' } as OAuth2TokenPayload;

            const tokenRepo = createFakeTokenRepository({
                isInactive: vi.fn().mockResolvedValue(true),
            });
            extractTokenHeader.mockReturnValue({ kid: keyId });
            verifyToken.mockResolvedValue(verifiedPayload);

            const key = {
                id: keyId,
                type: JWKType.OCT,
                decryption_key: 'secret',
            } as unknown as Key;
            const keyRepo: IOAuth2KeyRepository = {
                findByRealmId: vi.fn(),
                findById: vi.fn().mockResolvedValue(key),
            };

            const verifier = new OAuth2TokenVerifier(keyRepo, tokenRepo);
            await expect(verifier.verify('raw-token')).rejects.toThrow(JWTError);
            expect(tokenRepo.saveWithSignature).toHaveBeenCalled();
        });

        it('should skip active check in crypto path when skipActiveCheck is true', async () => {
            const jti = randomUUID();
            const keyId = randomUUID();
            const verifiedPayload: OAuth2TokenPayload = { jti, sub: 'u1' } as OAuth2TokenPayload;

            const tokenRepo = createFakeTokenRepository({
                isInactive: vi.fn().mockResolvedValue(true),
            });
            extractTokenHeader.mockReturnValue({ kid: keyId });
            verifyToken.mockResolvedValue(verifiedPayload);

            const key = {
                id: keyId,
                type: JWKType.OCT,
                decryption_key: 'secret',
            } as unknown as Key;
            const keyRepo: IOAuth2KeyRepository = {
                findByRealmId: vi.fn(),
                findById: vi.fn().mockResolvedValue(key),
            };

            const verifier = new OAuth2TokenVerifier(keyRepo, tokenRepo);
            const result = await verifier.verify('raw-token', { skipActiveCheck: true });
            expect(result).toBe(verifiedPayload);
            expect(tokenRepo.isInactive).not.toHaveBeenCalled();
        });
    });
});
