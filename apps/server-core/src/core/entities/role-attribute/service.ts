/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, definePolicyData } from '@authup/access';
import { EntityNotFoundError, ValidationError } from '@authup/errors';
import { inArray } from '@rapiq/core';
import { PermissionName } from '@authup/core-kit';
import type { RoleAttribute } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult  } from '@authup/server-kit';
import { AbstractEntityService } from '@authup/server-kit';
import type { IRoleAttributeRepository, IRoleAttributeService } from './types.ts';
import { appendQueryConditions, decodeQuery } from '../../query/index.ts';
import { roleAttributeSchema } from './schema.ts';

export type RoleAttributeServiceContext = {
    repository: IRoleAttributeRepository;
    reservedNames?: ReadonlySet<string>;
};

export class RoleAttributeService extends AbstractEntityService implements IRoleAttributeService {
    protected repository: IRoleAttributeRepository;

    protected reservedNames: ReadonlySet<string>;

    constructor(ctx: RoleAttributeServiceContext) {
        super();
        this.repository = ctx.repository;
        this.reservedNames = ctx.reservedNames ?? new Set();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<RoleAttribute>> {
        const permissionNames = [
            PermissionName.ROLE_READ,
            PermissionName.ROLE_UPDATE,
            PermissionName.ROLE_DELETE,
        ];

        await actor.permissionEvaluator.preEvaluateOneOf({ name: permissionNames });

        let parsed = await decodeQuery(query, { schema: roleAttributeSchema, actor });

        // Compile the read permissions into a row condition (#3286 phase 3): the
        // authorization runs as WHERE, so pagination and totals stay exact. A
        // non-expressible policy falls back to the per-row loop below.
        const compiled = await actor.permissionEvaluator.compile({ name: permissionNames });
        if (compiled.verdict === 'deny') {
            // no row can pass — a constant-false condition keeps the meta shape
            parsed = appendQueryConditions(parsed, inArray('id', []));
        } else if (compiled.verdict === 'conditional') {
            parsed = appendQueryConditions(parsed, compiled.condition);
        }

        if (compiled.verdict !== 'post') {
            return this.repository.findMany(parsed);
        }

        const {
            data: entities,
            meta,
        } = await this.repository.findMany(parsed);

        const data: RoleAttribute[] = [];
        let { total } = meta;

        for (const entity of entities) {
            try {
                await actor.permissionEvaluator.evaluateOneOf({
                    name: [
                        PermissionName.ROLE_READ,
                        PermissionName.ROLE_UPDATE,
                        PermissionName.ROLE_DELETE,
                    ],
                    data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity, ...this.resourceRealmMatch(entity) }),
                });
                data.push(entity);
            } catch {
                total--;
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
        id: string,
        actor: ActorContext,
    ): Promise<RoleAttribute> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.ROLE_READ,
                PermissionName.ROLE_UPDATE,
                PermissionName.ROLE_DELETE,
            ],
        });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        await actor.permissionEvaluator.evaluateOneOf({
            name: [
                PermissionName.ROLE_READ,
                PermissionName.ROLE_UPDATE,
                PermissionName.ROLE_DELETE,
            ],
            data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity, ...this.resourceRealmMatch(entity) }),
        });

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<RoleAttribute> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROLE_UPDATE });

        await this.repository.validateJoinColumns(data);

        if (typeof data.name === 'string' && this.reservedNames.has(data.name)) {
            throw new ValidationError(`The role-attribute name '${data.name}' collides with a Role entity column.`);
        }

        data.realmId = data.role.realmId;

        const entity = this.repository.create(data);

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROLE_UPDATE,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: { [data.name]: data.value },
                ...this.resourceRealmMatch(entity),
            }),
        });

        await this.repository.save(entity);

        return entity;
    }

    async update(
        id: string,
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<RoleAttribute> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROLE_UPDATE });

        await this.repository.validateJoinColumns(data);

        if (typeof data.name === 'string' && this.reservedNames.has(data.name)) {
            throw new ValidationError(`The role-attribute name '${data.name}' collides with a Role entity column.`);
        }

        let entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        // An attribute belongs to a fixed role; its owner (and the role-derived realmId) is
        // IMMUTABLE on update — strip both from the body. This blocks reassigning the attribute
        // to another role (which would otherwise be authorized against the new realm, not the
        // one the attribute currently lives in) and blocks a caller-supplied realmId that would
        // gate ROLE_UPDATE against a realm of their choosing. To move an attribute, delete + recreate.
        delete data.roleId;
        delete data.role;
        delete data.realmId;

        entity = this.repository.merge(entity, data);

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROLE_UPDATE,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: { [entity.name]: entity.value },
                ...this.resourceRealmMatch(entity),
            }),
        });

        await this.repository.save(entity);

        return entity;
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<RoleAttribute> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROLE_UPDATE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROLE_UPDATE,
            data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity, ...this.resourceRealmMatch(entity) }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
