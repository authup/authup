/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Key } from '@authup/core-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import { JWKError, JWKType } from '@authup/specs';
import {
    beforeEach, describe, expect, it, vi,
} from 'vitest';
import { OAuth2TokenSigner } from '../../../../../../src/core/oauth2/token/signer/module.ts';
import type { IOAuth2KeyRepository } from '../../../../../../src/core/oauth2/key/types.ts';

vi.mock('@authup/server-kit', () => ({
    signToken: vi.fn().mockResolvedValue('signed-jwt-token'),
}));

function createFakeKeyRepository(key: Key | null = null): IOAuth2KeyRepository {
    return {
        findByRealmId: vi.fn().mockResolvedValue(key),
        findById: vi.fn().mockResolvedValue(key),
    };
}

function createPayload(overrides: Partial<OAuth2TokenPayload> = {}): OAuth2TokenPayload {
    return {
        realm_id: randomUUID(),
        realm_name: 'master',
        sub: randomUUID(),
        sub_kind: 'user',
        ...overrides,
    } as OAuth2TokenPayload;
}

describe('OAuth2TokenSigner', () => {
    let signToken: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();
        const serverKit = await import('@authup/server-kit');
        signToken = serverKit.signToken as ReturnType<typeof vi.fn>;
    });

    it('should throw JWKError when payload has no realm_id', async () => {
        const keyRepo = createFakeKeyRepository();
        const signer = new OAuth2TokenSigner(keyRepo);
        const payload = createPayload({ realm_id: undefined });

        await expect(signer.sign(payload)).rejects.toThrow(JWKError);
    });

    it('should throw JWKError when no key found for realm', async () => {
        const keyRepo = createFakeKeyRepository(null);
        const signer = new OAuth2TokenSigner(keyRepo);

        await expect(signer.sign(createPayload())).rejects.toThrow(JWKError);
    });

    it('should throw JWKError when key has no decryption_key', async () => {
        const key = {
            id: randomUUID(),
            type: JWKType.OCT,
            decryption_key: null,
            realm_id: randomUUID(),
        } as unknown as Key;
        const keyRepo = createFakeKeyRepository(key);
        const signer = new OAuth2TokenSigner(keyRepo);

        await expect(signer.sign(createPayload())).rejects.toThrow(JWKError);
    });

    it('should sign with OCT key type', async () => {
        const key = {
            id: randomUUID(),
            type: JWKType.OCT,
            decryption_key: 'secret-key',
            realm_id: randomUUID(),
        } as unknown as Key;
        const keyRepo = createFakeKeyRepository(key);
        const signer = new OAuth2TokenSigner(keyRepo);
        const payload = createPayload();

        const result = await signer.sign(payload);
        expect(result).toBe('signed-jwt-token');
        expect(signToken).toHaveBeenCalledWith(payload, expect.objectContaining({
            type: JWKType.OCT,
            key: 'secret-key',
            keyId: key.id,
        }));
    });

    it('should sign with EC key type', async () => {
        const key = {
            id: randomUUID(),
            type: JWKType.EC,
            decryption_key: 'ec-private-key',
            signature_algorithm: 'ES256',
            realm_id: randomUUID(),
        } as unknown as Key;
        const keyRepo = createFakeKeyRepository(key);
        const signer = new OAuth2TokenSigner(keyRepo);

        const result = await signer.sign(createPayload());
        expect(result).toBe('signed-jwt-token');
        expect(signToken).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            type: JWKType.EC,
            key: 'ec-private-key',
            algorithm: 'ES256',
            keyId: key.id,
        }));
    });

    it('should sign with RSA key type', async () => {
        const key = {
            id: randomUUID(),
            type: JWKType.RSA,
            decryption_key: 'rsa-private-key',
            signature_algorithm: 'RS256',
            realm_id: randomUUID(),
        } as unknown as Key;
        const keyRepo = createFakeKeyRepository(key);
        const signer = new OAuth2TokenSigner(keyRepo);

        const result = await signer.sign(createPayload());
        expect(result).toBe('signed-jwt-token');
        expect(signToken).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            type: JWKType.RSA,
            key: 'rsa-private-key',
            algorithm: 'RS256',
            keyId: key.id,
        }));
    });
});
