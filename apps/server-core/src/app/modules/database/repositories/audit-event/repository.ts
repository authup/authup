/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuditEvent } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import { LessThan } from 'typeorm';
import { applyQuery } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type {
    AuditEventCountRecentFilter,
    AuditEventFindManyOptions,
    IAuditEventRepository,
} from '../../../../../core/index.ts';
import { applyRealmScopeSelect } from '../helpers.ts';

export class AuditEventRepositoryAdapter implements IAuditEventRepository {
    private readonly repository: Repository<AuditEvent>;

    constructor(repository: Repository<AuditEvent>) {
        this.repository = repository;
    }

    create(data: Partial<AuditEvent>): AuditEvent {
        return this.repository.create(data);
    }

    async save(entity: AuditEvent): Promise<AuditEvent> {
        return this.repository.save(entity);
    }

    async findOneById(id: string): Promise<AuditEvent | null> {
        return this.repository.findOneBy({ id });
    }

    async findMany(
        query: Record<string, any>,
        options: AuditEventFindManyOptions = {},
    ): Promise<EntityRepositoryFindManyResult<AuditEvent>> {
        const qb = this.repository.createQueryBuilder('auditEvent');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'auditEvent',
            fields: {
                allowed: [
                    'id',
                    'scope',
                    'name',
                    'ref_type',
                    'ref_id',
                    'client_id',
                    'actor_type',
                    'actor_id',
                    'actor_name',
                    'request_path',
                    'request_method',
                    'request_ip_address',
                    'request_user_agent',
                    'realm_id',
                    'data',
                    'expires_at',
                    'created_at',
                ],
            },
            filters: {
                allowed: [
                    'id',
                    'scope',
                    'name',
                    'ref_type',
                    'ref_id',
                    'client_id',
                    'actor_type',
                    'actor_id',
                    'actor_name',
                    'request_ip_address',
                    'realm_id',
                    'created_at',
                ],
            },
            sort: { allowed: ['created_at'] },
            pagination: { maxLimit: 50 },
        });

        applyRealmScopeSelect(qb, 'auditEvent', ['actor_id', 'actor_type']);

        if (options.owner) {
            // mandatory constraint — not overridable by a rapiq filter
            qb.andWhere('auditEvent.actor_id = :ownerActorId AND auditEvent.actor_type = :ownerActorType', {
                ownerActorId: options.owner.actorId,
                ownerActorType: options.owner.actorType,
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

    async countRecent(filter: AuditEventCountRecentFilter): Promise<number> {
        const qb = this.repository.createQueryBuilder('auditEvent')
            .where('auditEvent.name = :name', { name: filter.name })
            .andWhere('auditEvent.created_at > :since', { since: new Date(filter.since) });

        if (filter.actorName) {
            qb.andWhere('auditEvent.actor_name = :actorName', { actorName: filter.actorName });
        }

        if (filter.requestIpAddress) {
            qb.andWhere('auditEvent.request_ip_address = :requestIpAddress', { requestIpAddress: filter.requestIpAddress });
        }

        if (typeof filter.realmId !== 'undefined') {
            if (filter.realmId === null) {
                qb.andWhere('auditEvent.realm_id IS NULL');
            } else {
                qb.andWhere('auditEvent.realm_id = :realmId', { realmId: filter.realmId });
            }
        }

        return qb.getCount();
    }

    async deleteExpired(now: string): Promise<number> {
        const result = await this.repository.delete({ expires_at: LessThan(now) });

        return result.affected ?? 0;
    }
}
