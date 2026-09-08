/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider, IdentityProviderProtocol, Realm } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import { isUUID } from '@authup/kit';
import type { Repository } from 'typeorm';
import { validateEntityJoinColumns } from 'typeorm-extension';
import { applyQuery, fetchMany } from '../query.ts';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type { IIdentityProviderRepository, IRealmCipher, IRealmRepository } from '../../../../../core/index.ts';
import {
    IDENTITY_PROVIDER_SECRET_ATTRIBUTES,
    isRealmCipherBlob,
    isRealmCipherBlobError,
} from '../../../../../core/index.ts';
import { DatabaseConflictError } from '../../../../../adapters/database/index.ts';
import type { IdentityProviderRepository } from '../../../../../adapters/database/domains/index.ts';
import { IdentityProviderEntity } from '../../../../../adapters/database/domains/index.ts';
import { isEntityUnique, translateWhereConditions } from '../helpers.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

export type IdentityProviderRepositoryAdapterContext = {
    repository: IdentityProviderRepository,
    realmRepository: Repository<Realm>,
    /**
     * Encrypts the secret-bearing attributes
     * (`IDENTITY_PROVIDER_SECRET_ATTRIBUTES`) at rest under the provider
     * realm's encryption key. Without it the adapter writes them as given
     * and drops a stored blob it cannot decrypt.
     */
    cipher?: IRealmCipher,
};

export class IdentityProviderRepositoryAdapter implements IIdentityProviderRepository {
    private readonly repository: IdentityProviderRepository;

    private readonly realmRepository: IRealmRepository;

    private readonly cipher?: IRealmCipher;

    constructor(ctx: IdentityProviderRepositoryAdapterContext) {
        this.repository = ctx.repository;
        this.realmRepository = new RealmRepositoryAdapter(ctx.realmRepository);
        this.cipher = ctx.cipher;
    }

    async findMany(query: IQuery): Promise<EntityRepositoryFindManyResult<IdentityProvider>> {
        const qb = this.repository.createQueryBuilder('provider');
        qb.groupBy('provider.id');

        const { pagination } = applyQuery(qb, query);

        const { data: entities, total } = await fetchMany(qb, query);

        return {
            data: entities,
            meta: {
                total,
                ...pagination,
            },
        };
    }

    async findOneById(id: string): Promise<IdentityProvider | null> {
        const entity = await this.findOneBy({ id });
        if (entity) {
            await this.extendOneWithEA(entity);
        }
        return entity;
    }

    async findOneByName(name: string, realmKey?: string): Promise<IdentityProvider | null> {
        const qb = this.repository.createQueryBuilder('provider');
        qb.where('provider.name = :name', { name });

        if (realmKey) {
            const realmId = await this.realmRepository.resolveId(realmKey);
            if (!realmId) {
                return null;
            }
            qb.andWhere('provider.realmId = :realmId', { realmId });
        }

        const entity = await qb.getOne();
        if (entity) {
            await this.extendOneWithEA(entity);
        }
        return entity;
    }

    async findOneByIdOrName(idOrName: string, realm?: string): Promise<IdentityProvider | null> {
        return isUUID(idOrName) ?
            this.findOneById(idOrName) :
            this.findOneByName(idOrName, realm);
    }

    async findManyBy(where: Record<string, any>): Promise<IdentityProvider[]> {
        return this.repository.findBy(translateWhereConditions(where));
    }

    async findOneBy(where: Record<string, any>): Promise<IdentityProvider | null> {
        return this.repository.findOneBy(translateWhereConditions(where));
    }

    create(data: Partial<IdentityProvider>): IdentityProvider {
        return this.repository.create(data);
    }

    merge(entity: IdentityProvider, data: Partial<IdentityProvider>): IdentityProvider {
        return this.repository.merge(entity, data);
    }

    async save(entity: IdentityProvider): Promise<IdentityProvider> {
        return this.repository.save(entity);
    }

    async saveWithEA(
        entity: IdentityProvider,
        attributes?: Record<string, any>,
        options?: { keepAll?: boolean },
    ): Promise<IdentityProvider> {
        const record = entity as unknown as Record<string, unknown>;
        const stored = attributes ? { ...attributes } : undefined;
        // the extra-attribute adapter also lifts every non-column property
        // off the entity into the attribute rows, so a secret that rides
        // the entity is protected in place and its plaintext put back below
        const own: Record<string, string> = {};

        for (const name of IDENTITY_PROVIDER_SECRET_ATTRIBUTES) {
            if (stored && typeof stored[name] === 'string' && stored[name].length > 0) {
                stored[name] = await this.protect(stored[name], entity.realmId);
            }

            const value = record[name];
            if (typeof value === 'string' && value.length > 0) {
                own[name] = value;
                record[name] = await this.protect(value, entity.realmId);
            }
        }

        await this.repository.saveOneWithEA(entity, stored, options);

        // the adapter hands the stored values back onto the entity; the
        // caller, and the response built from it, gets the plaintext it gave
        for (const name of IDENTITY_PROVIDER_SECRET_ATTRIBUTES) {
            if (attributes && typeof attributes[name] === 'string') {
                record[name] = attributes[name];
            } else if (name in own) {
                record[name] = own[name];
            }
        }

        return entity;
    }

    async extendOneWithEA(entity: IdentityProvider): Promise<void> {
        await this.repository.extendOneWithEA(entity);
        await this.reveal(entity);
    }

    async remove(entity: IdentityProvider): Promise<void> {
        await this.repository.remove(entity);
    }

    async validateJoinColumns(data: Partial<IdentityProvider>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: IdentityProviderEntity,
        });
    }

    async checkUniqueness(data: Partial<IdentityProvider>, existing?: IdentityProvider): Promise<void> {
        const isUnique = await isEntityUnique({
            dataSource: this.repository.manager.connection,
            entityTarget: IdentityProviderEntity,
            entity: data,
            entityExisting: existing,
        });

        if (!isUnique) {
            throw new DatabaseConflictError();
        }
    }

    async findByProtocol(protocol: IdentityProviderProtocol, realmKey?: string): Promise<IdentityProvider[]> {
        const qb = this.repository.createQueryBuilder('provider');
        qb.where('provider.protocol = :protocol', { protocol });

        if (realmKey) {
            const realmId = await this.realmRepository.resolveId(realmKey);
            if (!realmId) {
                return [];
            }
            qb.andWhere('provider.realmId = :realmId', { realmId });
        }

        const entities = await qb.getMany();
        await this.repository.extendManyWithEA(entities);
        for (const entity of entities) {
            await this.reveal(entity);
        }
        return entities;
    }

    /**
     * Encrypt a secret for storage. The input is never sniffed: every
     * value a caller writes is a plaintext (a read reveals, so nothing
     * echoes a blob back), and a secret that happens to start with the
     * blob prefix must round-trip like any other rather than be stored
     * raw and dropped by the next read. Without a cipher the value is
     * stored as given, which is the pre-plan-070 behaviour.
     */
    private async protect(value: string, realmId: string): Promise<string> {
        if (!this.cipher) {
            return value;
        }

        return this.cipher.encrypt(value, realmId);
    }

    /**
     * Decrypt the secret-bearing attributes a read extended onto the
     * entity. A legacy plaintext passes through untouched and is encrypted
     * by the next save. A blob the cipher cannot open (an unknown, disabled
     * or foreign key) is dropped: the provider stays readable, the secret is
     * not recoverable right now, and a login through it fails closed rather
     * than presenting ciphertext to the upstream.
     */
    private async reveal(entity: IdentityProvider): Promise<void> {
        const record = entity as unknown as Record<string, unknown>;

        for (const name of IDENTITY_PROVIDER_SECRET_ATTRIBUTES) {
            const value = record[name];
            if (typeof value !== 'string' || !isRealmCipherBlob(value)) {
                continue;
            }

            if (!this.cipher) {
                Reflect.deleteProperty(record, name);
                continue;
            }

            try {
                record[name] = await this.cipher.decrypt(value, entity.realmId);
            } catch (e) {
                if (!isRealmCipherBlobError(e)) {
                    throw e;
                }

                Reflect.deleteProperty(record, name);
            }
        }
    }
}
