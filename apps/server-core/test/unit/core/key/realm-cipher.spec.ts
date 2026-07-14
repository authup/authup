/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Key, Realm } from '@authup/core-kit';
import { KeyStatus } from '@authup/core-kit';
import { isAuthupError } from '@authup/errors';
import { JWKType, JWKUse } from '@authup/specs';
import { describe, expect, it } from 'vitest';
import { REALM_CIPHER_BLOB_VERSION, RealmCipher, isRealmCipherBlobError } from '../../../../src/core/key/index.ts';
import { FakeKeyStore } from '../helpers/index.ts';

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
        name: 'enc-test',
        type: JWKType.OCT,
        use: JWKUse.ENCRYPTION,
        status: KeyStatus.ACTIVE,
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
        const cipher = new RealmCipher({ keyStore: new FakeKeyStore(key) });

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
        const source = new RealmCipher({ keyStore: new FakeKeyStore(key) });
        const blob = await source.encrypt('seed-material', realmId);

        const repository = new FakeKeyStore(key);
        const cipher = new RealmCipher({ keyStore: repository });

        expect(await cipher.decrypt(blob, realmId)).toEqual('seed-material');
        expect(repository.resolveByIdCalls).toEqual([key.id]);
    });

    it('re-resolves the key on every decrypt — disable is an immediate, reversible kill switch', async () => {
        const realmId = randomUUID();
        const key = buildEncKey(realmId);
        const repository = new FakeKeyStore(key);
        const cipher = new RealmCipher({ keyStore: repository });

        const blob = await cipher.encrypt('seed-material', realmId);
        expect(await cipher.decrypt(blob, realmId)).toEqual('seed-material');

        // only the imported MATERIAL is cached — status is read fresh, so a
        // disabled key stops decrypting immediately...
        repository.setKey({ ...key, status: KeyStatus.DISABLED });
        await expect(cipher.decrypt(blob, realmId)).rejects.toThrow(/disabled/);

        // ...and re-enabling restores it without a restart.
        repository.setKey(key);
        expect(await cipher.decrypt(blob, realmId)).toEqual('seed-material');
    });

    it('rejects a blob referencing an unknown key', async () => {
        const realmId = randomUUID();
        const source = new RealmCipher({ keyStore: new FakeKeyStore(buildEncKey(realmId)) });
        const blob = await source.encrypt('seed-material', realmId);

        const cipher = new RealmCipher({ keyStore: new FakeKeyStore(null) });

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
        const cipher = new RealmCipher({ keyStore: new FakeKeyStore(key) });

        const blob = await cipher.encrypt('seed-material', realmId);

        await expect(cipher.decrypt(blob, randomUUID())).rejects.toThrow(/foreign realm/);
    });

    it('never decrypts with a signature key', async () => {
        const realmId = randomUUID();
        const key = buildEncKey(realmId);
        const source = new RealmCipher({ keyStore: new FakeKeyStore(key) });
        const blob = await source.encrypt('seed-material', realmId);

        const cipher = new RealmCipher({ keyStore: new FakeKeyStore({ ...key, use: JWKUse.SIGNATURE }) });

        await expect(cipher.decrypt(blob, realmId)).rejects.toThrow(/unknown encryption key/);
    });

    it('rejects malformed and foreign-version blobs', async () => {
        const realmId = randomUUID();
        const cipher = new RealmCipher({ keyStore: new FakeKeyStore(buildEncKey(realmId)) });

        await expect(cipher.decrypt('garbage', realmId)).rejects.toThrow(/malformed/);
        await expect(cipher.decrypt(`v2.${randomUUID()}.payload`, realmId)).rejects.toThrow(/malformed/);
    });

    it('fails loud when no enc key can be resolved for the realm', async () => {
        const cipher = new RealmCipher({ keyStore: new FakeKeyStore(null) });

        await expect(cipher.encrypt('seed-material', randomUUID())).rejects.toThrow(/enc key/);
    });

    it('classifies blob-semantics failures as RealmCipherBlobError (fail-closed class)', async () => {
        const realmId = randomUUID();
        const key = buildEncKey(realmId);
        const cipher = new RealmCipher({ keyStore: new FakeKeyStore(key) });
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
        const empty = new RealmCipher({ keyStore: new FakeKeyStore(null) });
        try {
            await empty.decrypt(blob, realmId);
        } catch (e) {
            expect(isRealmCipherBlobError(e)).toBeTruthy();
        }
    });
});
