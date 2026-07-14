/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SymmetricCipher } from '@authup/server-kit';
import { JWKType, JWKUse } from '@authup/specs';
import { DataSource } from 'typeorm';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { KeyEntity, RealmEntity } from '../../../../../src/adapters/database/domains/index.ts';
import { WRAPPED_KEY_MATERIAL_PREFIX } from '../../../../../src/core/index.ts';
import { KeyRepositoryAdapter } from '../../../../../src/app/modules/oauth2/repositories/key/repository.ts';

const KEK = new SymmetricCipher(Buffer.alloc(32, 3).toString('base64'));

describe('app/modules/oauth2/repositories/key', () => {
    let dataSource : DataSource;
    let realmId : string;

    // isolated in-memory database — the KEK wrap/unwrap matrix must never
    // touch the suite-shared sqlite file (a wrapped master-realm signing key
    // would poison every KEK-less parallel suite).
    beforeAll(async () => {
        dataSource = new DataSource({
            type: 'better-sqlite3',
            database: ':memory:',
            entities: [RealmEntity, KeyEntity],
            synchronize: true,
        });
        await dataSource.initialize();

        const realm = await dataSource.getRepository(RealmEntity).save(
            dataSource.getRepository(RealmEntity).create({ name: 'master', built_in: true }),
        );
        realmId = realm.id;
    });

    afterAll(async () => {
        await dataSource.destroy();
    });

    async function readRawMaterial(id: string) : Promise<string | null> {
        const row = await dataSource.getRepository(KeyEntity)
            .createQueryBuilder('key')
            .addSelect('key.decryption_key')
            .where('key.id = :id', { id })
            .getOne();

        return row?.decryption_key ?? null;
    }

    it('creates sig and enc keys lazily per (realm, use) — idempotent', async () => {
        const repository = new KeyRepositoryAdapter(dataSource);

        const sig = await repository.findByRealmId(realmId, JWKUse.SIGNATURE);
        expect(sig).toBeDefined();
        expect(sig!.type).toEqual(JWKType.RSA);
        expect(sig!.use).toEqual(JWKUse.SIGNATURE);
        expect(sig!.signature_algorithm).toEqual('RS256');
        expect(sig!.decryption_key).toBeDefined();
        expect(sig!.encryption_key).toBeDefined();

        const enc = await repository.findByRealmId(realmId, JWKUse.ENCRYPTION);
        expect(enc).toBeDefined();
        expect(enc!.type).toEqual(JWKType.OCT);
        expect(enc!.use).toEqual(JWKUse.ENCRYPTION);
        expect(enc!.signature_algorithm).toBeNull();
        expect(enc!.encryption_key).toBeNull();
        // 32 bytes of oct material, usable as a cipher key as-is
        expect(() => new SymmetricCipher(enc!.decryption_key!)).not.toThrow();

        expect(enc!.id).not.toEqual(sig!.id);

        // a second resolve returns the same keys — no duplicate mints
        const sigAgain = await repository.findByRealmId(realmId, JWKUse.SIGNATURE);
        const encAgain = await repository.findByRealmId(realmId, JWKUse.ENCRYPTION);
        expect(sigAgain!.id).toEqual(sig!.id);
        expect(encAgain!.id).toEqual(enc!.id);
        expect(encAgain!.decryption_key).toEqual(enc!.decryption_key);
    });

    it('persists material wrapped under a KEK and unwraps transparently on read', async () => {
        const repository = new KeyRepositoryAdapter(dataSource, { secretsCipher: KEK });

        const realm = await dataSource.getRepository(RealmEntity).save(
            dataSource.getRepository(RealmEntity).create({ name: 'wrapped-realm' }),
        );

        const enc = await repository.findByRealmId(realm.id, JWKUse.ENCRYPTION);
        // the caller always receives usable material ...
        expect(() => new SymmetricCipher(enc!.decryption_key!)).not.toThrow();

        // ... while the row stores it wrapped
        const raw = await readRawMaterial(enc!.id);
        expect(raw!.startsWith(WRAPPED_KEY_MATERIAL_PREFIX)).toBeTruthy();

        const reRead = await repository.findById(enc!.id);
        expect(reRead!.decryption_key).toEqual(enc!.decryption_key);
    });

    it('lazily wraps pre-existing plaintext rows once a KEK appears', async () => {
        const realm = await dataSource.getRepository(RealmEntity).save(
            dataSource.getRepository(RealmEntity).create({ name: 'lazy-wrap-realm' }),
        );

        const plainRepository = new KeyRepositoryAdapter(dataSource);
        const enc = await plainRepository.findByRealmId(realm.id, JWKUse.ENCRYPTION);
        expect((await readRawMaterial(enc!.id))!.startsWith(WRAPPED_KEY_MATERIAL_PREFIX)).toBeFalsy();

        const wrappedRepository = new KeyRepositoryAdapter(dataSource, { secretsCipher: KEK });
        const reRead = await wrappedRepository.findById(enc!.id);
        expect(reRead!.decryption_key).toEqual(enc!.decryption_key);

        // the read wrote the wrapped form back
        expect((await readRawMaterial(enc!.id))!.startsWith(WRAPPED_KEY_MATERIAL_PREFIX)).toBeTruthy();

        // and it still round-trips through the wrapped repository
        const again = await wrappedRepository.findById(enc!.id);
        expect(again!.decryption_key).toEqual(enc!.decryption_key);
    });

    it('fails loud when wrapped material meets a KEK-less repository', async () => {
        const realm = await dataSource.getRepository(RealmEntity).save(
            dataSource.getRepository(RealmEntity).create({ name: 'kek-removed-realm' }),
        );

        const wrappedRepository = new KeyRepositoryAdapter(dataSource, { secretsCipher: KEK });
        const enc = await wrappedRepository.findByRealmId(realm.id, JWKUse.ENCRYPTION);

        const plainRepository = new KeyRepositoryAdapter(dataSource);
        await expect(plainRepository.findById(enc!.id)).rejects.toThrow(/SECRETS_ENCRYPTION_KEY/);
    });
});
