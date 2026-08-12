/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import type { IQuery } from '@rapiq/core';
import type { Key } from '@authup/core-kit';
import { KeyStatus  } from '@authup/core-kit';
import { arrayBufferToBase64, createNanoID, isUUID } from '@authup/kit';
import {
    AsymmetricKey,
    CryptoAsymmetricAlgorithm,
    type EntityRepositoryFindManyResult,
    type ISymmetricCipher,
    type Logger,
    createAsymmetricKeyPair,
} from '@authup/server-kit';
import { JWKType, JWKUse, JWTAlgorithm } from '@authup/specs';
import type { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { Like } from 'typeorm';
import { validateEntityJoinColumns } from 'typeorm-extension';
import { applyQuery, redactFieldConditions } from '../query.ts';
import { getRandomValues } from 'uncrypto';
import {
    DatabaseConflictError,
    KeyEntity,
    RealmEntity,
    UserAuthenticatorEntity,
} from '../../../../../adapters/database/index.ts';
import type { IKeyRepository, IKeyStore, IRealmRepository } from '../../../../../core/index.ts';
import {
    REALM_CIPHER_BLOB_VERSION,
    isWrappedKeyMaterial,
    unwrapKeyMaterial,
    wrapKeyMaterial,
} from '../../../../../core/index.ts';
import { applyRealmScopeSelect, isEntityUnique, translateWhereConditions } from '../helpers.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

export type KeyRepositoryAdapterOptions = {
    /**
     * Optional KEK (config secretsEncryptionKey) — when present, key
     * material is persisted wrapped and unwrapped transparently on read.
     */
    secretsCipher?: ISymmetricCipher | null,
    logger?: Logger,
};

/**
 * One adapter, two ports: the entity CRUD surface (IKeyRepository) for the
 * key management API and the material-resolving store (IKeyStore) for the
 * signer / verifier / realm cipher. Entity reads never select
 * decryptionKey; only the IKeyStore surface hands out (unwrapped) material.
 */
export class KeyRepositoryAdapter implements IKeyRepository, IKeyStore {
    protected dataSource : DataSource;

    protected secretsCipher : ISymmetricCipher | null;

    protected realmRepository : IRealmRepository;

    protected logger? : Logger;

    /**
     * In-flight mints keyed `<realmId>:<use>` — see {@link mintExclusive}.
     */
    protected mints : Map<string, Promise<Key>> = new Map();

    constructor(dataSource: DataSource, options: KeyRepositoryAdapterOptions = {}) {
        this.dataSource = dataSource;
        this.secretsCipher = options.secretsCipher ?? null;
        this.logger = options.logger;
        this.realmRepository = new RealmRepositoryAdapter(dataSource.getRepository(RealmEntity));
    }

    protected get repository() : Repository<KeyEntity> {
        return this.dataSource.getRepository(KeyEntity);
    }

    // ------------------------------------------------------------------
    // IKeyStore — material resolution (signer / verifier / realm cipher)
    // ------------------------------------------------------------------

    protected findActiveKey(realmId: string, use: `${JWKUse}`) : Promise<KeyEntity | null> {
        return this.repository.findOne({
            select: {
                id: true,
                name: true,
                type: true,
                use: true,
                status: true,
                signatureAlgorithm: true,
                encryptionKey: true,
                decryptionKey: true,
                realmId: true,
            },
            where: {
                realmId,
                use,
                status: KeyStatus.ACTIVE,
            },
            // createdAt + id break priority ties deterministically, so key
            // selection stays stable whenever a realm holds several active
            // keys (a rotation in progress, or a cross-process mint race).
            order: {
                priority: 'DESC',
                createdAt: 'DESC',
                id: 'ASC',
            },
        });
    }

    async resolveOrCreate(realmId: string, use: `${JWKUse}`): Promise<Key> {
        const entity = await this.findActiveKey(realmId, use);
        if (entity) {
            return this.afterLoad(this.repository, entity);
        }

        return this.mintExclusive(realmId, use);
    }

    /**
     * Minting is check-then-act (read, count, insert), and the callers are
     * hot paths — the token signer resolves a signature key for EVERY
     * issuance, the realm cipher an encryption key for every MFA seed — so
     * a freshly created realm routinely takes several simultaneous calls
     * and each one would insert its own key. Concurrent mints for one
     * (realm, use) therefore share a single in-flight promise.
     *
     * The map is per adapter instance, and the store is a DI singleton, so
     * it is scoped to one application: two applications in one process
     * (the test suite) never share mint state. Separate PROCESSES can still
     * race, which is why the duplicate stays tolerable rather than fatal —
     * both keys are published in JWKS and verify, and `findActiveKey`
     * orders deterministically, so a duplicate costs a redundant row, not
     * a broken token.
     */
    protected mintExclusive(realmId: string, use: `${JWKUse}`) : Promise<Key> {
        const cacheKey = `${realmId}:${use}`;

        const inFlight = this.mints.get(cacheKey);
        if (inFlight) {
            return inFlight;
        }

        const promise = this.mint(realmId, use);
        this.mints.set(cacheKey, promise);

        return promise.finally(() => {
            this.mints.delete(cacheKey);
        });
    }

    protected async mint(realmId: string, use: `${JWKUse}`) : Promise<Key> {
        const { repository } = this;

        // Re-read under the guard: the caller's lookup may predate a mint
        // that has since completed and left the map, so the in-flight
        // check alone would not see it.
        const entity = await this.findActiveKey(realmId, use);
        if (entity) {
            return this.afterLoad(repository, entity);
        }

        const total = await repository.countBy({ realmId, use });
        if (total > 0) {
            // an admin who disabled every key meant it — do not silently
            // re-mint around the kill switch.
            throw new AuthupError(
                `No active ${use} key is available for realm ${realmId} ` +
                `(${total} key(s) exist, none active).`,
            );
        }

        if (use === JWKUse.ENCRYPTION) {
            return this.createEncryptionKey(repository, realmId);
        }

        return this.createSignatureKey(repository, realmId);
    }

    async resolveById(id: string): Promise<Key | null> {
        const { repository } = this;

        // `id` reaches here from an attacker-controlled JWT `kid` header on the
        // token-verification hot path. A non-UUID value binds against a
        // postgres `uuid` column as a driver-level type error (500) instead of
        // a clean miss — short-circuit to "not found" so a garbage kid is a
        // plain verification failure.
        if (!isUUID(id)) {
            return null;
        }

        const entity = await repository.findOne({
            select: {
                id: true,
                name: true,
                type: true,
                use: true,
                status: true,
                signatureAlgorithm: true,
                encryptionKey: true,
                decryptionKey: true,
                realmId: true,
            },
            where: { id },
        });

        if (!entity) {
            return null;
        }

        return this.afterLoad(repository, entity);
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
            name: this.generateName(JWKUse.SIGNATURE),
            type: JWKType.RSA,
            use: JWKUse.SIGNATURE,
            status: KeyStatus.ACTIVE,
            decryptionKey: await this.protect(material),
            encryptionKey: await publicKeyContainer.toBase64(),
            realmId,
            signatureAlgorithm: `${JWTAlgorithm.RS256}`,
        });

        await repository.save(entity);

        // hand the caller usable material regardless of the persisted form.
        entity.decryptionKey = material;

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
            name: this.generateName(JWKUse.ENCRYPTION),
            type: JWKType.OCT,
            use: JWKUse.ENCRYPTION,
            status: KeyStatus.ACTIVE,
            decryptionKey: await this.protect(material),
            encryptionKey: null,
            realmId,
            signatureAlgorithm: null,
        });

        await repository.save(entity);

        entity.decryptionKey = material;

        return entity;
    }

    protected generateName(use: `${JWKUse}`) : string {
        return `${use}-${createNanoID(10)}`;
    }

    protected async afterLoad(
        repository: Repository<KeyEntity>,
        entity: KeyEntity,
    ) : Promise<Key> {
        if (!entity.decryptionKey) {
            return entity;
        }

        if (isWrappedKeyMaterial(entity.decryptionKey)) {
            entity.decryptionKey = await unwrapKeyMaterial(this.secretsCipher, entity.decryptionKey);
            return entity;
        }

        if (this.secretsCipher) {
            // lazy wrap-on-read: a KEK added to a running deployment
            // hardens existing rows without a migration step. Best-effort —
            // the material stays readable either way.
            const material = entity.decryptionKey;
            try {
                await repository.update(entity.id, { decryptionKey: await wrapKeyMaterial(this.secretsCipher, material) });
            } catch (e) {
                // Best-effort — the material stays readable and the next read
                // retries. Surface it though: a persistent failure (e.g. a
                // read-only replica) means the row is never hardened at rest.
                this.logger?.warn(`Failed to wrap key material at rest for key ${entity.id}.`, { error: e });
            }
            entity.decryptionKey = material;
        }

        return entity;
    }

    protected async protect(material: string) : Promise<string> {
        if (!this.secretsCipher) {
            return material;
        }

        return wrapKeyMaterial(this.secretsCipher, material);
    }

    // ------------------------------------------------------------------
    // IKeyRepository — entity CRUD surface (key management API)
    // ------------------------------------------------------------------

    async findMany(query: IQuery): Promise<EntityRepositoryFindManyResult<Key>> {
        const qb = this.repository.createQueryBuilder('keyEntity');
        qb.groupBy('keyEntity.id');

        const { pagination } = applyQuery(qb, query);

        applyRealmScopeSelect(qb, 'keyEntity');

        const [entities, total] = await qb.getManyAndCount();

        return {
            data: redactFieldConditions(query, entities),
            meta: {
                total,
                ...pagination,
            },
        };
    }

    async findOneById(id: string): Promise<Key | null> {
        return this.findOneBy({ id });
    }

    async findOneByName(name: string, realmKey?: string): Promise<Key | null> {
        const where : FindOptionsWhere<KeyEntity> = { name };

        if (realmKey) {
            const realmId = await this.realmRepository.resolveId(realmKey);
            if (!realmId) {
                return null;
            }

            where.realmId = realmId;
        }

        return this.repository.findOneBy(where);
    }

    async findOneByIdOrName(idOrName: string, realm?: string): Promise<Key | null> {
        return isUUID(idOrName) ?
            this.findOneById(idOrName) :
            this.findOneByName(idOrName, realm);
    }

    async findManyBy(where: Record<string, any>): Promise<Key[]> {
        return this.repository.findBy(translateWhereConditions(where));
    }

    async findOneBy(where: Record<string, any>): Promise<Key | null> {
        return this.repository.findOneBy(translateWhereConditions(where));
    }

    create(data: Partial<Key>): Key {
        return this.repository.create(data);
    }

    merge(entity: Key, data: Partial<Key>): Key {
        return this.repository.merge(entity as KeyEntity, data);
    }

    async save(entity: Key): Promise<Key> {
        if (
            entity.decryptionKey &&
            this.secretsCipher &&
            !isWrappedKeyMaterial(entity.decryptionKey)
        ) {
            const material = entity.decryptionKey;
            entity.decryptionKey = await wrapKeyMaterial(this.secretsCipher, material);
            const saved = await this.repository.save(entity as KeyEntity);
            saved.decryptionKey = material;
            return saved;
        }

        return this.repository.save(entity as KeyEntity);
    }

    async remove(entity: Key): Promise<void> {
        await this.repository.remove(entity as KeyEntity);
    }

    async validateJoinColumns(data: Partial<Key>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.dataSource,
            entityTarget: KeyEntity,
        });
    }

    async checkUniqueness(data: Partial<Key>, existing?: Key): Promise<void> {
        const isUnique = await isEntityUnique({
            dataSource: this.dataSource,
            entityTarget: KeyEntity,
            entity: data,
            entityExisting: existing,
        });

        if (!isUnique) {
            throw new DatabaseConflictError();
        }
    }

    async countBlobReferences(keyId: string): Promise<number> {
        return this.dataSource.getRepository(UserAuthenticatorEntity).countBy({ secret: Like(`${REALM_CIPHER_BLOB_VERSION}.${keyId}.%`) });
    }

    async findHighestPriority(realmId: string, use: string): Promise<number | null> {
        return this.repository.maximum('priority', { realmId, use: use as `${JWKUse}` });
    }
}
