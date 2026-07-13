/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Consent } from '@authup/core-kit';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import { hasOwnProperty, isObject } from '@authup/kit';
import type { DataSource, Repository } from 'typeorm';
import { applyQuery } from 'typeorm-extension';
import { CachePrefix, ConsentEntity } from '../../../../../adapters/database/domains/index.ts';
import type {
    ConsentFindManyOptions,
    ConsentOwner,
    IConsentRepository,
} from '../../../../../core/index.ts';
import { CONSENT_FILTER_KEYS } from '../../../../../core/index.ts';
import { applyRealmScopeSelect } from '../../../database/repositories/helpers.ts';

function isUniqueConstraintError(input: unknown): boolean {
    if (!isObject(input)) {
        return false;
    }

    const codes = ['ER_DUP_ENTRY', '23505', 'SQLITE_CONSTRAINT_UNIQUE'];

    if (
        hasOwnProperty(input, 'code') &&
        typeof input.code === 'string' &&
        codes.includes(input.code)
    ) {
        return true;
    }

    if (
        hasOwnProperty(input, 'driverError') &&
        isObject(input.driverError) &&
        hasOwnProperty(input.driverError, 'code') &&
        typeof input.driverError.code === 'string' &&
        codes.includes(input.driverError.code)
    ) {
        return true;
    }

    return false;
}

export class ConsentRepositoryAdapter implements IConsentRepository {
    protected repository: Repository<ConsentEntity>;

    constructor(dataSource: DataSource) {
        this.repository = dataSource.getRepository(ConsentEntity);
    }

    async findMany(
        query: Record<string, any>,
        options: ConsentFindManyOptions = {},
    ): Promise<EntityRepositoryFindManyResult<Consent>> {
        const qb = this.repository.createQueryBuilder('consent');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'consent',
            fields: {
                allowed: [
                    'id',
                    'client_id',
                    'realm_id',
                    'sub',
                    'sub_kind',
                    'scope',
                    'expires_at',
                    'created_at',
                    'updated_at',
                ],
            },
            filters: { allowed: [...CONSENT_FILTER_KEYS] },
            relations: { allowed: ['client', 'realm'] },
            sort: { allowed: ['created_at', 'updated_at', 'scope'] },
            pagination: { maxLimit: 50 },
        });

        applyRealmScopeSelect(qb, 'consent', ['sub', 'sub_kind']);

        if (options.owner) {
            // mandatory constraint — not overridable by a rapiq filter
            qb.andWhere('consent.sub = :ownerSub AND consent.sub_kind = :ownerSubKind', {
                ownerSub: options.owner.sub,
                ownerSubKind: options.owner.subKind,
            });
        }

        const [entities, total] = await qb.getManyAndCount();

        return {
            data: entities,
            meta: {
                total,
                ...pagination,
            },
        };
    }

    async findOneById(id: string): Promise<Consent | null> {
        return this.repository.findOneBy({ id });
    }

    async findAllBySubjectClient(clientId: string, owner: ConsentOwner): Promise<Consent[]> {
        const qb = this.repository.createQueryBuilder('consent');
        qb.where('consent.client_id = :clientId AND consent.sub = :sub AND consent.sub_kind = :subKind', {
            clientId,
            sub: owner.sub,
            subKind: owner.subKind,
        });
        qb.cache(
            buildRedisKeyPath({
                prefix: CachePrefix.CONSENT_COVERING,
                key: `${clientId}:${owner.subKind}:${owner.sub}`,
            }),
            60_000,
        );

        return qb.getMany();
    }

    async insertMissing(input: {
        clientId: string,
        realmId: string,
        owner: ConsentOwner,
        scopes: string[]
    }): Promise<void> {
        // uncached read — the diff must see the latest rows, and the covering
        // cache entry must not be refreshed on the write path.
        const existing = await this.repository.createQueryBuilder('consent')
            .where('consent.client_id = :clientId AND consent.sub = :sub AND consent.sub_kind = :subKind', {
                clientId: input.clientId,
                sub: input.owner.sub,
                subKind: input.owner.subKind,
            })
            .getMany();

        const existingTokens = new Set(existing.map((row) => row.scope));
        const missing = input.scopes.filter((token) => !existingTokens.has(token));

        // save-per-row (never a raw qb insert): entity-manager saves fire the
        // ConsentEntitySubscriber — covering-cache invalidation, realtime
        // destinations and audit mirroring depend on it. A duplicate-key
        // violation is the benign race outcome under the unique index.
        for (const scope of missing) {
            const entity = this.repository.create({
                client_id: input.clientId,
                realm_id: input.realmId,
                sub: input.owner.sub,
                sub_kind: input.owner.subKind,
                scope,
                expires_at: null,
            });

            try {
                await this.repository.save(entity);
            } catch (e) {
                if (!isUniqueConstraintError(e)) {
                    throw e;
                }
            }
        }
    }

    async remove(entity: Consent): Promise<void> {
        await this.repository.remove(entity as ConsentEntity);
    }
}
