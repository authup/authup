/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BuiltInPolicyType,
    evaluateRecord,
    evaluateRecordOneOf,
    reachesRecordOneOf,
} from '@authup/access';
import type { IQuery } from '@rapiq/core';
import { ValidatorGroup, isUUID } from '@authup/kit';
import { EntityNotFoundError } from '@authup/errors';
import {
    PermissionName,
    ScopeValidator,
} from '@authup/core-kit';
import type { Scope } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult  } from '@authup/server-kit';
import type { IRealmRepository } from '../realm/types.ts';
import { AbstractEntityService } from '@authup/server-kit';
import type { IScopeRepository, IScopeService } from './types.ts';
import { decodeQuery, scopeReadQuery } from '../../query/index.ts';
import type { ReadScope } from '../../query/index.ts';
import { scopeSchema } from './schema.ts';

export type ScopeServiceContext = {
    repository: IScopeRepository;
    realmRepository: IRealmRepository;
};

const PERMISSION_NAMES = [
    PermissionName.SCOPE_READ,
    PermissionName.SCOPE_UPDATE,
    PermissionName.SCOPE_DELETE,
];

export class ScopeService extends AbstractEntityService implements IScopeService {
    protected repository: IScopeRepository;

    protected realmRepository: IRealmRepository;

    protected validator: ScopeValidator;

    constructor(ctx: ScopeServiceContext) {
        super();
        this.repository = ctx.repository;
        this.realmRepository = ctx.realmRepository;
        this.validator = new ScopeValidator();
    }

    async scopeRead(query: IQuery, actor: ActorContext): Promise<ReadScope> {
        return scopeReadQuery(query, actor, { names: PERMISSION_NAMES });
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<Scope>> {
        const parsed = await decodeQuery(query, { schema: scopeSchema, actor });

        // the list's gate, shared with the entity's statistic (scopeRead):
        // a reach that lowers runs as WHERE, so pagination and totals stay
        // exact; a non-expressible policy falls back to the per-row loop below
        const scope = await this.scopeRead(parsed, actor);
        const { data: entities, meta } = await this.repository.findMany(scope.query);

        if (!scope.post) {
            return { data: entities, meta };
        }

        const data: Scope[] = [];
        let { total } = meta;

        for (const entity of entities) {
            const reached = await reachesRecordOneOf(actor.permissionEvaluator, {
                name: PERMISSION_NAMES,
                realm: entity.realmId,
                data: { [BuiltInPolicyType.ATTRIBUTES]: entity },
            });
            if (!reached) {
                total -= 1;
                continue;
            }

            data.push(entity);
        }

        return {
            data,
            meta: {
                ...meta,
                total,
            },
        };
    }

    async getOne(
        idOrName: string,
        actor: ActorContext,
    ): Promise<Scope> {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: PERMISSION_NAMES });

        const entity = await this.repository.findOneByIdOrName(idOrName);
        if (!entity) {
            throw new EntityNotFoundError();
        }

        await evaluateRecordOneOf(actor.permissionEvaluator, {
            name: PERMISSION_NAMES,
            realm: entity.realmId,
            data: { [BuiltInPolicyType.ATTRIBUTES]: entity },
        });

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<Scope> {
        const { entity } = await this.save(undefined, data, actor);
        return entity;
    }

    async update(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<Scope> {
        const { entity } = await this.save(idOrName, data, actor, { updateOnly: true });
        return entity;
    }

    async save(
        idOrName: string | undefined,
        data: Record<string, any>,
        actor: ActorContext,
        options: { updateOnly?: boolean } = {},
    ): Promise<{
        entity: Scope,
        created: boolean 
    }> {
        let group: string;

        let entity: Scope | null | undefined;
        if (idOrName) {
            const where: Record<string, any> = {};
            if (isUUID(idOrName)) {
                where.id = idOrName;
            } else {
                where.name = idOrName;
            }

            if (typeof data.realmId === 'string') {
                // A realm key that does not resolve is refused: dropping the
                // predicate would address a row of whichever realm holds the
                // name.
                const realm = await this.realmRepository.resolveOrFail(data.realmId);
                entity = await this.repository.findOneBy({ ...where, realmId: realm.id });
            } else {
                // No realm value means global on create, so a name key
                // without one addresses the global row. A UUID key names
                // one specific row and needs no realm.
                if (!where.id) {
                    where.realmId = null;
                }

                entity = await this.repository.findOneBy(where);
            }
            // Only a NAME key may upsert-create. A UUID addresses one specific
            // row, so a miss is a 404 (creating would write a different id).
            if (!entity && (options.updateOnly || where.id)) {
                throw new EntityNotFoundError();
            }
        } else if (options.updateOnly) {
            throw new EntityNotFoundError();
        }

        if (entity) {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.SCOPE_UPDATE });
            group = ValidatorGroup.UPDATE;
        } else {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.SCOPE_CREATE });
            group = ValidatorGroup.CREATE;
        }

        const validated = await this.validator.run(data, { group });

        await this.repository.validateJoinColumns(validated);

        if (entity) {
            await this.evaluateUpdate(
                actor,
                PermissionName.SCOPE_UPDATE,
                entity,
                { ...entity, ...validated },
                { realm: (row) => row.realmId },
            );

            await this.repository.checkUniqueness(validated, entity);

            entity = this.repository.merge(entity, validated);
            await this.repository.save(entity);

            return {
                entity,
                created: false, 
            };
        }

        validated.realmId = validated.realmId ?? null;

        await evaluateRecord(actor.permissionEvaluator, {
            name: PermissionName.SCOPE_CREATE,
            realm: validated.realmId ?? null,
            data: { [BuiltInPolicyType.ATTRIBUTES]: validated },
        });

        await this.repository.checkUniqueness(validated);

        entity = this.repository.create(validated);
        await this.repository.save(entity);

        return {
            entity,
            created: true, 
        };
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<Scope> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.SCOPE_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        await evaluateRecord(actor.permissionEvaluator, {
            name: PermissionName.SCOPE_DELETE,
            realm: entity.realmId,
            data: { [BuiltInPolicyType.ATTRIBUTES]: entity },
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
