/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Key } from '@authup/core-kit';
import { arrayBufferToBase64 } from '@authup/kit';
import {
    AsymmetricKey,
    CryptoAsymmetricAlgorithm,
    type ISymmetricCipher,
    createAsymmetricKeyPair,
} from '@authup/server-kit';
import { JWKType, JWKUse, JWTAlgorithm } from '@authup/specs';
import type { DataSource, Repository } from 'typeorm';
import { getRandomValues } from 'uncrypto';
import { KeyEntity } from '../../../../../adapters/database/index.ts';
import type { IKeyRepository } from '../../../../../core/index.ts';
import { isWrappedKeyMaterial, unwrapKeyMaterial, wrapKeyMaterial } from '../../../../../core/index.ts';

export type KeyRepositoryAdapterOptions = {
    /**
     * Optional KEK (config secretsEncryptionKey) — when present, key
     * material is persisted wrapped and unwrapped transparently on read.
     */
    secretsCipher?: ISymmetricCipher | null,
};

export class KeyRepositoryAdapter implements IKeyRepository {
    protected dataSource : DataSource;

    protected secretsCipher : ISymmetricCipher | null;

    constructor(dataSource: DataSource, options: KeyRepositoryAdapterOptions = {}) {
        this.dataSource = dataSource;
        this.secretsCipher = options.secretsCipher ?? null;
    }

    async findByRealmId(realmId: string, use: `${JWKUse}`): Promise<Key | null> {
        return this.createOrGet({ realm_id: realmId, use });
    }

    async findById(id: string): Promise<Key | null> {
        return this.createOrGet({ id });
    }

    protected async createOrGet(where: {
        realm_id?: string,
        id?: string,
        use?: `${JWKUse}`
    }) : Promise<Key | null> {
        const repository = this.dataSource.getRepository(KeyEntity);

        const entity = await repository.findOne({
            select: {
                id: true,
                type: true,
                use: true,
                signature_algorithm: true,
                encryption_key: true,
                decryption_key: true,
                realm_id: true,
            },
            where,
            order: { priority: 'DESC' },
        });

        if (entity) {
            return this.afterLoad(repository, entity);
        }

        if (typeof where.realm_id !== 'string' || !where.use) {
            return null;
        }

        if (where.use === JWKUse.ENCRYPTION) {
            return this.createEncryptionKey(repository, where.realm_id);
        }

        return this.createSignatureKey(repository, where.realm_id);
    }

    protected async createSignatureKey(
        repository: Repository<KeyEntity>,
        realmId: string,
    ) : Promise<Key> {
        const keyPair = await createAsymmetricKeyPair({ name: CryptoAsymmetricAlgorithm.RSASSA_PKCS1_V1_5 });

        const privateKeyContainer = new AsymmetricKey(keyPair.privateKey);
        const publicKeyContainer = new AsymmetricKey(keyPair.publicKey);

        const material = await privateKeyContainer.toBase64();

        const entity = repository.create({
            type: JWKType.RSA,
            use: JWKUse.SIGNATURE,
            decryption_key: await this.protect(material),
            encryption_key: await publicKeyContainer.toBase64(),
            realm_id: realmId,
            signature_algorithm: `${JWTAlgorithm.RS256}`,
        });

        await repository.save(entity);

        // hand the caller usable material regardless of the persisted form.
        entity.decryption_key = material;

        return entity;
    }

    protected async createEncryptionKey(
        repository: Repository<KeyEntity>,
        realmId: string,
    ) : Promise<Key> {
        const raw = new Uint8Array(32);
        getRandomValues(raw);

        const material = arrayBufferToBase64(raw.buffer);

        const entity = repository.create({
            type: JWKType.OCT,
            use: JWKUse.ENCRYPTION,
            decryption_key: await this.protect(material),
            encryption_key: null,
            realm_id: realmId,
            signature_algorithm: null,
        });

        await repository.save(entity);

        entity.decryption_key = material;

        return entity;
    }

    protected async afterLoad(
        repository: Repository<KeyEntity>,
        entity: KeyEntity,
    ) : Promise<Key> {
        if (!entity.decryption_key) {
            return entity;
        }

        if (isWrappedKeyMaterial(entity.decryption_key)) {
            entity.decryption_key = await unwrapKeyMaterial(this.secretsCipher, entity.decryption_key);
            return entity;
        }

        if (this.secretsCipher) {
            // lazy wrap-on-read: a KEK added to a running deployment
            // hardens existing rows without a migration step. Best-effort —
            // the material stays readable either way.
            const material = entity.decryption_key;
            try {
                await repository.update(entity.id, { decryption_key: await wrapKeyMaterial(this.secretsCipher, material) });
            } catch {
                // ignore — the next read retries.
            }
            entity.decryption_key = material;
        }

        return entity;
    }

    protected async protect(material: string) : Promise<string> {
        if (!this.secretsCipher) {
            return material;
        }

        return wrapKeyMaterial(this.secretsCipher, material);
    }
}
