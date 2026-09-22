/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, definePolicyData } from '@authup/access';
import type { IQuery } from '@rapiq/core';
import { ValidatorGroup, isPropertySet, isUUID } from '@authup/kit';
import { EntityNotFoundError, ValidationError } from '@authup/errors';
import {
    PermissionName,
    ROLE_ADMIN_NAME,
    RoleValidator,
} from '@authup/core-kit';
import type { Role } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult  } from '@authup/server-kit';
import type { IRealmRepository } from '../realm/types.ts';
import { AbstractEntityService } from '@authup/server-kit';
import type { IRoleRepository, IRoleService } from './types.ts';
import { decodeQuery, scopeReadQuery } from '../../query/index.ts';
import type { ReadScope } from '../../query/index.ts';
import { roleSchema } from './schema.ts';

export type RoleServiceContext = {
    repository: IRoleRepository;
    realmRepository: IRealmRepository;
};

const PERMISSION_NAMES = [
    PermissionName.ROLE_READ,
    PermissionName.ROLE_UPDATE,
    PermissionName.ROLE_DELETE,
];

export class RoleService extends AbstractEntityService implements IRoleService {
    protected repository: IRoleRepository;

    protected realmRepository: IRealmRepository;

    protected validator: RoleValidator;

    constructor(ctx: RoleServiceContext) {
        super();
        this.repository = ctx.repository;
        this.realmRepository = ctx.realmRepository;
        this.validator = new RoleValidator();
    }

    async scopeRead(query: IQuery, actor: ActorContext): Promise<ReadScope> {
        return scopeReadQuery(query, actor, { names: PERMISSION_NAMES });
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<Role>> {
        const parsed = await decodeQuery(query, { schema: roleSchema, actor });

        // the list's gate, shared with the entity's statistic (scopeRead):
        // a reach that lowers runs as WHERE, so pagination and totals stay
        // exact; a non-expressible policy falls back to the per-row loop below
        const scope = await this.scopeRead(parsed, actor);
        const { data: entities, meta } = await this.repository.findMany(scope.query);

        if (!scope.post) {
            return { data: entities, meta };
        }

        const data: Role[] = [];
        let { total } = meta;

        for (const entity of entities) {
            try {
                await actor.permissionEvaluator.evaluateOneOf({
                    name: PERMISSION_NAMES,
                    data: definePolicyData({
                        [BuiltInPolicyType.ATTRIBUTES]: entity,
                        ...this.resourceRealmMatch(entity),
                    }),
                });
                data.push(entity);
            } catch {
                total -= 1;
            }
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
    ): Promise<Role> {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: PERMISSION_NAMES });

        const entity = await this.repository.findOneByIdOrName(idOrName);
        if (!entity) {
            throw new EntityNotFoundError();
        }

        await actor.permissionEvaluator.evaluateOneOf({
            name: PERMISSION_NAMES,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: entity,
                ...this.resourceRealmMatch(entity),
            }),
        });

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<Role> {
        const { entity } = await this.save(undefined, data, actor);
        return entity;
    }

    async update(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<Role> {
        const { entity } = await this.save(idOrName, data, actor, { updateOnly: true });
        return entity;
    }

    async save(
        idOrName: string | undefined,
        data: Record<string, any>,
        actor: ActorContext,
        options: { updateOnly?: boolean } = {},
    ): Promise<{
        entity: Role,
        created: boolean 
    }> {
        let group: string;

        const realm = typeof data.realmId === 'string' ?
            await this.realmRepository.resolve(data.realmId) :
            undefined;

        let entity: Role | null | undefined;
        if (idOrName) {
            const where: Record<string, any> = {};
            if (isUUID(idOrName)) {
                where.id = idOrName;
            } else {
                where.name = idOrName;
            }

            if (realm) {
                where.realmId = realm.id;
            }

            entity = await this.repository.findOneBy(where);
            // Only a NAME key may upsert-create. A UUID addresses one specific
            // row, so a miss is a 404 (creating would write a different id).
            if (!entity && (options.updateOnly || where.id)) {
                throw new EntityNotFoundError();
            }
        } else if (options.updateOnly) {
            throw new EntityNotFoundError();
        }

        if (entity) {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROLE_UPDATE });
            group = ValidatorGroup.UPDATE;
        } else {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROLE_CREATE });
            group = ValidatorGroup.CREATE;
        }

        const validated = await this.validator.run(data, { group });

        await this.repository.validateJoinColumns(validated);

        if (entity) {
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.ROLE_UPDATE,
                data: definePolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: {
                        ...entity,
                        ...validated,
                    },
                    [BuiltInPolicyType.REALM_MATCH]: validated.realmId ?? entity.realmId ?? null,
                }),
            });

            entity = this.repository.merge(entity, validated);
            await this.repository.checkUniqueness(validated, entity);
            await this.repository.save(entity);

            return {
                entity,
                created: false, 
            };
        }

        if (!isPropertySet(validated, 'realmId') && actor.identity) {
            validated.realmId = this.getActorRealmId(actor) || null;
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROLE_CREATE,
            data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: validated, ...this.resourceRealmMatch(validated) }),
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
    ): Promise<Role> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROLE_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        if (entity.name === ROLE_ADMIN_NAME) {
            throw new ValidationError('The default admin role can not be deleted.');
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROLE_DELETE,
            data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity, ...this.resourceRealmMatch(entity) }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
