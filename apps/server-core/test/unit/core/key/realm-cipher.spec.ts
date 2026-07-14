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
import { REALM_CIPHER_BLOB_VERSION, RealmCipher, isRealmCipherBlobError } from '../../../../src/core/key/index.ts';
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

        const blob = await cipher.encrypt('seed-material', realmId);

        const parts = blob.split('.');
        expect(parts).toHaveLength(3);
        expect(parts[0]).toEqual(REALM_CIPHER_BLOB_VERSION);
        expect(parts[1]).toEqual(key.id);

        expect(await cipher.decrypt(blob, realmId)).toEqual('seed-material');
    });

    it('resolves the decryption key by the id the blob carries', async () => {
        const realmId = randomUUID();
        const key = buildEncKey(realmId);
        const source = new RealmCipher({ keyRepository: new FakeKeyRepository(key) });
        const blob = await source.encrypt('seed-material', realmId);

        const repository = new FakeKeyRepository(key);
        const cipher = new RealmCipher({ keyRepository: repository });

        expect(await cipher.decrypt(blob, realmId)).toEqual('seed-material');
        expect(repository.findByIdCalls).toEqual([key.id]);
    });

    it('caches the imported cipher per key id', async () => {
        const realmId = randomUUID();
        const key = buildEncKey(realmId);
        const repository = new FakeKeyRepository(key);
        const cipher = new RealmCipher({ keyRepository: repository });

        const blob = await cipher.encrypt('seed-material', realmId);

        // the key store no longer resolves anything — the cached entry
        // from encrypt still decrypts.
        repository.setKey(null);
        expect(await cipher.decrypt(blob, realmId)).toEqual('seed-material');
    });

    it('rejects a blob referencing an unknown key', async () => {
        const realmId = randomUUID();
        const source = new RealmCipher({ keyRepository: new FakeKeyRepository(buildEncKey(realmId)) });
        const blob = await source.encrypt('seed-material', realmId);

        const cipher = new RealmCipher({ keyRepository: new FakeKeyRepository(null) });

        expect.assertions(1);
        try {
            await cipher.decrypt(blob, realmId);
        } catch (e) {
            expect(isAuthupError(e)).toBeTruthy();
        }
    });

    it('rejects a blob whose key belongs to a foreign realm', async () => {
        const realmId = randomUUID();
        const key = buildEncKey(realmId);
        const cipher = new RealmCipher({ keyRepository: new FakeKeyRepository(key) });

        const blob = await cipher.encrypt('seed-material', realmId);

        await expect(cipher.decrypt(blob, randomUUID())).rejects.toThrow(/foreign realm/);
    });

    it('never decrypts with a signature key', async () => {
        const realmId = randomUUID();
        const key = buildEncKey(realmId);
        const source = new RealmCipher({ keyRepository: new FakeKeyRepository(key) });
        const blob = await source.encrypt('seed-material', realmId);

        const cipher = new RealmCipher({ keyRepository: new FakeKeyRepository({ ...key, use: JWKUse.SIGNATURE }) });

        await expect(cipher.decrypt(blob, realmId)).rejects.toThrow(/unknown encryption key/);
    });

    it('rejects malformed and foreign-version blobs', async () => {
        const realmId = randomUUID();
        const cipher = new RealmCipher({ keyRepository: new FakeKeyRepository(buildEncKey(realmId)) });

        await expect(cipher.decrypt('garbage', realmId)).rejects.toThrow(/malformed/);
        await expect(cipher.decrypt(`v2.${randomUUID()}.payload`, realmId)).rejects.toThrow(/malformed/);
    });

    it('fails loud when no enc key can be resolved for the realm', async () => {
        const cipher = new RealmCipher({ keyRepository: new FakeKeyRepository(null) });

        await expect(cipher.encrypt('seed-material', randomUUID())).rejects.toThrow(/encryption key/);
    });

    it('classifies blob-semantics failures as RealmCipherBlobError (fail-closed class)', async () => {
        const realmId = randomUUID();
        const key = buildEncKey(realmId);
        const cipher = new RealmCipher({ keyRepository: new FakeKeyRepository(key) });
        const blob = await cipher.encrypt('seed-material', realmId);

        expect.assertions(2);

        // tampered payload — failed GCM authentication
        const [version, keyId] = blob.split('.');
        const tampered = [version, keyId, Buffer.alloc(32, 9).toString('base64')].join('.');
        try {
            await cipher.decrypt(tampered, realmId);
        } catch (e) {
            expect(isRealmCipherBlobError(e)).toBeTruthy();
        }

        // unknown key reference
        const empty = new RealmCipher({ keyRepository: new FakeKeyRepository(null) });
        try {
            await empty.decrypt(blob, realmId);
        } catch (e) {
            expect(isRealmCipherBlobError(e)).toBeTruthy();
        }
    });
});
