/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Consent } from '@authup/core-kit';
import { EntityType, IdentityType  } from '@authup/core-kit';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import type { DataSource, Repository } from 'typeorm';
import { applyRequestQuery } from '../../../database/repositories/query.ts';
import { CachePrefix, ConsentEntity } from '../../../../../adapters/database/domains/index.ts';
import { isUniqueConstraintDatabaseError } from '../../../../../adapters/database/errors/index.ts';
import type {
    ConsentFindManyOptions,
    ConsentOwner,
    IConsentRepository,
} from '../../../../../core/index.ts';
import { applyRealmScopeSelect } from '../../../database/repositories/helpers.ts';

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

        const { pagination } = applyRequestQuery(qb, query, { schema: EntityType.CONSENT });

        applyRealmScopeSelect(qb, 'consent', ['sub', 'subKind']);

        // Always expose only a client SUMMARY (id / name / displayName /
        // builtIn) — NEVER the full ClientEntity (redirectUri + post-logout
        // patterns = the trusted-origin set, grantTypes, baseUrl/rootUrl,
        // secret-storage flags, accessPolicyId). `client` is deliberately
        // absent from relations.allowed so a raw ?include=client cannot force
        // the full-column join; the self-service Applications tab still gets
        // the display name from this fixed projection.
        qb.leftJoin('consent.client', 'client')
            .addSelect([
                'client.id',
                'client.name',
                'client.displayName',
                'client.builtIn',
            ]);

        if (options.owner) {
            // mandatory constraint — not overridable by a rapiq filter
            qb.andWhere('consent.sub = :ownerSub AND consent.subKind = :ownerSubKind', {
                ownerSub: options.owner.sub,
                ownerSubKind: options.owner.subKind,
            });
        }

        if (options.realmId) {
            // nested `/realms/:realmId/consents` mount — mandatory constraint,
            // not overridable by a rapiq filter
            qb.andWhere('consent.realmId = :realmId', { realmId: options.realmId });
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
        qb.where('consent.clientId = :clientId AND consent.sub = :sub AND consent.subKind = :subKind', {
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
            .where('consent.clientId = :clientId AND consent.sub = :sub AND consent.subKind = :subKind', {
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
        // Set the userId FK only when the subject is a user, so a user
        // deletion cascade-drops its consent rows; non-user subjects leave it
        // null (the row is still cleaned up when its client/realm is deleted).
        const userId = input.owner.subKind === IdentityType.USER ?
            input.owner.sub :
            null;

        for (const scope of missing) {
            const entity = this.repository.create({
                clientId: input.clientId,
                realmId: input.realmId,
                userId,
                sub: input.owner.sub,
                subKind: input.owner.subKind,
                scope,
                expiresAt: null,
            });

            try {
                await this.repository.save(entity);
            } catch (e) {
                if (!isUniqueConstraintDatabaseError(e)) {
                    throw e;
                }
            }
        }
    }

    async remove(entity: Consent): Promise<void> {
        await this.repository.remove(entity as ConsentEntity);
    }
}
