/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { KeyStatus } from '@authup/core-kit';
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
import { KeyRepositoryAdapter } from '../../../../../src/app/modules/database/repositories/key/repository.ts';

const KEK = new SymmetricCipher(Buffer.alloc(32, 3).toString('base64'));

describe('app/modules/database/repositories/key', () => {
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
            dataSource.getRepository(RealmEntity).create({ name: 'master', builtIn: true }),
        );
        realmId = realm.id;
    });

    afterAll(async () => {
        await dataSource.destroy();
    });

    async function readRawMaterial(id: string) : Promise<string | null> {
        const row = await dataSource.getRepository(KeyEntity)
            .createQueryBuilder('key')
            .addSelect('key.decryptionKey')
            .where('key.id = :id', { id })
            .getOne();

        return row?.decryptionKey ?? null;
    }

    it('creates sig and enc keys lazily per (realm, use) — idempotent', async () => {
        const repository = new KeyRepositoryAdapter(dataSource);

        const sig = await repository.resolveOrCreate(realmId, JWKUse.SIGNATURE);
        expect(sig).toBeDefined();
        expect(sig!.type).toEqual(JWKType.RSA);
        expect(sig!.use).toEqual(JWKUse.SIGNATURE);
        expect(sig!.signatureAlgorithm).toEqual('RS256');
        expect(sig!.decryptionKey).toBeDefined();
        expect(sig!.encryptionKey).toBeDefined();

        const enc = await repository.resolveOrCreate(realmId, JWKUse.ENCRYPTION);
        expect(enc).toBeDefined();
        expect(enc!.type).toEqual(JWKType.OCT);
        expect(enc!.use).toEqual(JWKUse.ENCRYPTION);
        expect(enc!.signatureAlgorithm).toBeNull();
        expect(enc!.encryptionKey).toBeNull();
        // 32 bytes of oct material, usable as a cipher key as-is
        expect(() => new SymmetricCipher(enc!.decryptionKey!)).not.toThrow();

        expect(enc!.id).not.toEqual(sig!.id);

        // a second resolve returns the same keys — no duplicate mints
        const sigAgain = await repository.resolveOrCreate(realmId, JWKUse.SIGNATURE);
        const encAgain = await repository.resolveOrCreate(realmId, JWKUse.ENCRYPTION);
        expect(sigAgain!.id).toEqual(sig!.id);
        expect(encAgain!.id).toEqual(enc!.id);
        expect(encAgain!.decryptionKey).toEqual(enc!.decryptionKey);

        // minted keys carry a generated canonical name + active status
        expect(sig!.name).toMatch(/^sig-[a-z0-9]+$/);
        expect(enc!.name).toMatch(/^enc-[a-z0-9]+$/);
        expect(sig!.status).toEqual(KeyStatus.ACTIVE);
    });

    it('resolves the highest-priority ACTIVE key — passive keys never sign/encrypt', async () => {
        const repository = new KeyRepositoryAdapter(dataSource);
        const realm = await dataSource.getRepository(RealmEntity).save(
            dataSource.getRepository(RealmEntity).create({ name: 'lifecycle-realm' }),
        );

        const active = await repository.resolveOrCreate(realm.id, JWKUse.SIGNATURE);

        // a higher-priority PASSIVE key must not be picked
        const keyRepository = dataSource.getRepository(KeyEntity);
        await keyRepository.save(keyRepository.create({
            name: 'passive-newer',
            type: JWKType.RSA,
            use: JWKUse.SIGNATURE,
            status: KeyStatus.PASSIVE,
            priority: 99,
            encryptionKey: 'stub-public',
            decryptionKey: 'stub-private',
            signatureAlgorithm: 'RS256',
            realmId: realm.id,
        }));

        const resolved = await repository.resolveOrCreate(realm.id, JWKUse.SIGNATURE);
        expect(resolved!.id).toEqual(active!.id);
    });

    it('fails loud instead of re-minting when every key is disabled (kill switch)', async () => {
        const repository = new KeyRepositoryAdapter(dataSource);
        const realm = await dataSource.getRepository(RealmEntity).save(
            dataSource.getRepository(RealmEntity).create({ name: 'disabled-realm' }),
        );

        const key = await repository.resolveOrCreate(realm.id, JWKUse.SIGNATURE);
        await dataSource.getRepository(KeyEntity).update(key!.id, { status: KeyStatus.DISABLED });

        await expect(repository.resolveOrCreate(realm.id, JWKUse.SIGNATURE))
            .rejects.toThrow(/none active/);

        // re-enabling restores resolution without a new mint
        await dataSource.getRepository(KeyEntity).update(key!.id, { status: KeyStatus.ACTIVE });
        const resolved = await repository.resolveOrCreate(realm.id, JWKUse.SIGNATURE);
        expect(resolved!.id).toEqual(key!.id);
    });

    it('persists material wrapped under a KEK and unwraps transparently on read', async () => {
        const repository = new KeyRepositoryAdapter(dataSource, { secretsCipher: KEK });

        const realm = await dataSource.getRepository(RealmEntity).save(
            dataSource.getRepository(RealmEntity).create({ name: 'wrapped-realm' }),
        );

        const enc = await repository.resolveOrCreate(realm.id, JWKUse.ENCRYPTION);
        // the caller always receives usable material ...
        expect(() => new SymmetricCipher(enc!.decryptionKey!)).not.toThrow();

        // ... while the row stores it wrapped
        const raw = await readRawMaterial(enc!.id);
        expect(raw!.startsWith(WRAPPED_KEY_MATERIAL_PREFIX)).toBeTruthy();

        const reRead = await repository.resolveById(enc!.id);
        expect(reRead!.decryptionKey).toEqual(enc!.decryptionKey);
    });

    it('lazily wraps pre-existing plaintext rows once a KEK appears', async () => {
        const realm = await dataSource.getRepository(RealmEntity).save(
            dataSource.getRepository(RealmEntity).create({ name: 'lazy-wrap-realm' }),
        );

        const plainRepository = new KeyRepositoryAdapter(dataSource);
        const enc = await plainRepository.resolveOrCreate(realm.id, JWKUse.ENCRYPTION);
        expect((await readRawMaterial(enc!.id))!.startsWith(WRAPPED_KEY_MATERIAL_PREFIX)).toBeFalsy();

        const wrappedRepository = new KeyRepositoryAdapter(dataSource, { secretsCipher: KEK });
        const reRead = await wrappedRepository.resolveById(enc!.id);
        expect(reRead!.decryptionKey).toEqual(enc!.decryptionKey);

        // the read wrote the wrapped form back
        expect((await readRawMaterial(enc!.id))!.startsWith(WRAPPED_KEY_MATERIAL_PREFIX)).toBeTruthy();

        // and it still round-trips through the wrapped repository
        const again = await wrappedRepository.resolveById(enc!.id);
        expect(again!.decryptionKey).toEqual(enc!.decryptionKey);
    });

    it('fails loud when wrapped material meets a KEK-less repository', async () => {
        const realm = await dataSource.getRepository(RealmEntity).save(
            dataSource.getRepository(RealmEntity).create({ name: 'kek-removed-realm' }),
        );

        const wrappedRepository = new KeyRepositoryAdapter(dataSource, { secretsCipher: KEK });
        const enc = await wrappedRepository.resolveOrCreate(realm.id, JWKUse.ENCRYPTION);

        const plainRepository = new KeyRepositoryAdapter(dataSource);
        await expect(plainRepository.resolveById(enc!.id)).rejects.toThrow(/SECRETS_ENCRYPTION_KEY/);
    });
});
