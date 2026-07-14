/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Key, Realm } from '@authup/core-kit';
import { isAuthupError } from '@authup/errors';
import { JWKType, JWKUse } from '@authup/specs';
import { describe, expect, it } from 'vitest';
import { REALM_CIPHER_BLOB_VERSION, RealmCipher } from '../../../../src/core/key/index.ts';
import { FakeKeyRepository } from '../helpers/index.ts';

const TIMESTAMP = '2026-01-01T00:00:00.000Z';

function buildRealm(id: string): Realm {
    return {
        id,
        name: 'master',
        display_name: null,
        description: null,
        built_in: true,
        created_at: TIMESTAMP,
        updated_at: TIMESTAMP,
    };
}

function buildEncKey(realmId: string, overrides: Partial<Key> = {}): Key {
    return {
        id: randomUUID(),
        type: JWKType.OCT,
        use: JWKUse.ENCRYPTION,
        signature_algorithm: null,
        priority: 0,
        decryption_key: Buffer.alloc(32, 5).toString('base64'),
        encryption_key: null,
        created_at: TIMESTAMP,
        updated_at: TIMESTAMP,
        realm_id: realmId,
        realm: buildRealm(realmId),
        ...overrides,
    };
}

describe('core/key/realm-cipher', () => {
    it('encrypts into a self-describing versioned blob and round-trips', async () => {
        const realmId = randomUUID();
        const key = buildEncKey(realmId);
        const cipher = new RealmCipher({ keyRepository: new FakeKeyRepository(key) });

        const blob = await cipher.encrypt(realmId, 'seed-material');

        const parts = blob.split('.');
        expect(parts).toHaveLength(3);
        expect(parts[0]).toEqual(REALM_CIPHER_BLOB_VERSION);
        expect(parts[1]).toEqual(key.id);

        expect(await cipher.decrypt(blob)).toEqual('seed-material');
        expect(await cipher.decrypt(blob, realmId)).toEqual('seed-material');
    });

    it('resolves the decryption key by the id the blob carries', async () => {
        const realmId = randomUUID();
        const key = buildEncKey(realmId);
        const source = new RealmCipher({ keyRepository: new FakeKeyRepository(key) });
        const blob = await source.encrypt(realmId, 'seed-material');

        const repository = new FakeKeyRepository(key);
        const cipher = new RealmCipher({ keyRepository: repository });

        expect(await cipher.decrypt(blob)).toEqual('seed-material');
        expect(repository.findByIdCalls).toEqual([key.id]);
    });

    it('caches the imported cipher per key id', async () => {
        const realmId = randomUUID();
        const key = buildEncKey(realmId);
        const repository = new FakeKeyRepository(key);
        const cipher = new RealmCipher({ keyRepository: repository });

        const blob = await cipher.encrypt(realmId, 'seed-material');

        // the key store no longer resolves anything — the cached entry
        // from encrypt still decrypts.
        repository.setKey(null);
        expect(await cipher.decrypt(blob)).toEqual('seed-material');
    });

    it('rejects a blob referencing an unknown key', async () => {
        const realmId = randomUUID();
        const source = new RealmCipher({ keyRepository: new FakeKeyRepository(buildEncKey(realmId)) });
        const blob = await source.encrypt(realmId, 'seed-material');

        const cipher = new RealmCipher({ keyRepository: new FakeKeyRepository(null) });

        expect.assertions(1);
        try {
            await cipher.decrypt(blob);
        } catch (e) {
            expect(isAuthupError(e)).toBeTruthy();
        }
    });

    it('rejects a blob whose key belongs to a foreign realm', async () => {
        const realmId = randomUUID();
        const key = buildEncKey(realmId);
        const cipher = new RealmCipher({ keyRepository: new FakeKeyRepository(key) });

        const blob = await cipher.encrypt(realmId, 'seed-material');

        await expect(cipher.decrypt(blob, randomUUID())).rejects.toThrow(/foreign realm/);
    });

    it('never decrypts with a signature key', async () => {
        const realmId = randomUUID();
        const key = buildEncKey(realmId);
        const source = new RealmCipher({ keyRepository: new FakeKeyRepository(key) });
        const blob = await source.encrypt(realmId, 'seed-material');

        const cipher = new RealmCipher({ keyRepository: new FakeKeyRepository({ ...key, use: JWKUse.SIGNATURE }) });

        await expect(cipher.decrypt(blob)).rejects.toThrow(/unknown encryption key/);
    });

    it('rejects malformed and foreign-version blobs', async () => {
        const realmId = randomUUID();
        const cipher = new RealmCipher({ keyRepository: new FakeKeyRepository(buildEncKey(realmId)) });

        await expect(cipher.decrypt('garbage')).rejects.toThrow(/malformed/);
        await expect(cipher.decrypt(`v2.${randomUUID()}.payload`)).rejects.toThrow(/malformed/);
    });

    it('fails loud when no enc key can be resolved for the realm', async () => {
        const cipher = new RealmCipher({ keyRepository: new FakeKeyRepository(null) });

        await expect(cipher.encrypt(randomUUID(), 'seed-material')).rejects.toThrow(/encryption key/);
    });
});
