/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Consent } from '@authup/core-kit';
import { IdentityType } from '@authup/core-kit';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import type { DataSource, Repository } from 'typeorm';
import { applyQuery } from 'typeorm-extension';
import { CachePrefix, ConsentEntity } from '../../../../../adapters/database/domains/index.ts';
import { isUniqueConstraintDatabaseError } from '../../../../../adapters/database/errors/index.ts';
import type {
    ConsentFindManyOptions,
    ConsentOwner,
    IConsentRepository,
} from '../../../../../core/index.ts';
import { CONSENT_FILTER_KEYS } from '../../../../../core/index.ts';
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

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'consent',
            fields: {
                // `default` (not just `allowed`) so applyQuery adds an explicit
                // per-column SELECT: it populates expressionMap.selects, which
                // applyRealmScopeSelect dedupes against. Without it the default
                // "select all" is implicit (empty selects) and the force-select
                // re-adds consent.sub — a duplicate `consent_sub` alias that
                // mysql rejects under the client join (see helpers.ts).
                default: [
                    'id',
                    'client_id',
                    'realm_id',
                    'user_id',
                    'sub',
                    'sub_kind',
                    'scope',
                    'expires_at',
                    'created_at',
                    'updated_at',
                ],
            },
            filters: { allowed: [...CONSENT_FILTER_KEYS] },
            relations: { allowed: ['realm'] },
            sort: { allowed: ['created_at', 'updated_at', 'scope'] },
            pagination: { maxLimit: 50 },
        });

        applyRealmScopeSelect(qb, 'consent', ['sub', 'sub_kind']);

        // Always expose only a client SUMMARY (id / name / display_name /
        // built_in) — NEVER the full ClientEntity (redirect_uri + post-logout
        // patterns = the trusted-origin set, grant_types, base_url/root_url,
        // secret-storage flags, access_policy_id). `client` is deliberately
        // absent from relations.allowed so a raw ?include=client cannot force
        // the full-column join; the self-service Applications tab still gets
        // the display name from this fixed projection.
        qb.leftJoin('consent.client', 'client')
            .addSelect([
                'client.id',
                'client.name',
                'client.display_name',
                'client.built_in',
            ]);

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
        // Set the user_id FK only when the subject is a user, so a user
        // deletion cascade-drops its consent rows; non-user subjects leave it
        // null (the row is still cleaned up when its client/realm is deleted).
        const userId = input.owner.subKind === IdentityType.USER ?
            input.owner.sub :
            null;

        for (const scope of missing) {
            const entity = this.repository.create({
                client_id: input.clientId,
                realm_id: input.realmId,
                user_id: userId,
                sub: input.owner.sub,
                sub_kind: input.owner.subKind,
                scope,
                expires_at: null,
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
