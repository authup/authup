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
import { EntityNotFoundError, ValidationError } from '@authup/errors';
import { ValidatorGroup, isObject } from '@authup/kit';
import { inArray } from '@rapiq/core';
import { PermissionName } from '@authup/core-kit';
import type { RoleAttribute } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult  } from '@authup/server-kit';
import { AbstractEntityService } from '@authup/server-kit';
import { buildErrorMessageForAttribute } from 'validup';
import type { IRoleAttributeRepository, IRoleAttributeService } from './types.ts';
import { appendQueryConditions, decodeQuery } from '../../query/index.ts';
import { roleAttributeSchema } from './schema.ts';
import { EntityAttributeValidator } from '../attribute/index.ts';

export type RoleAttributeServiceContext = {
    repository: IRoleAttributeRepository;
    reservedNames?: ReadonlySet<string>;
};

export class RoleAttributeService extends AbstractEntityService implements IRoleAttributeService {
    protected repository: IRoleAttributeRepository;

    protected reservedNames: ReadonlySet<string>;

    protected validator: EntityAttributeValidator;

    constructor(ctx: RoleAttributeServiceContext) {
        super();
        this.repository = ctx.repository;
        this.validator = new EntityAttributeValidator();
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
            const reached = await reachesRecordOneOf(actor.permissionEvaluator, {
                name: [
                    PermissionName.ROLE_READ,
                    PermissionName.ROLE_UPDATE,
                    PermissionName.ROLE_DELETE,
                ],
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

        await evaluateRecordOneOf(actor.permissionEvaluator, {
            name: [
                PermissionName.ROLE_READ,
                PermissionName.ROLE_UPDATE,
                PermissionName.ROLE_DELETE,
            ],
            realm: entity.realmId,
            data: { [BuiltInPolicyType.ATTRIBUTES]: entity },
        });

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<RoleAttribute> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROLE_UPDATE });

        // A body may name the owner through the `role` relation, but only its
        // ID is taken: with no join column to resolve it from,
        // `validateJoinColumns` keeps such an object VERBATIM, and its
        // `realmId` would then gate ROLE_UPDATE against a realm of the
        // caller's choosing. Reduced to the id, the realm comes from the row
        // the join-column validation loads. A `roleId` alongside it wins.
        if (typeof data.role !== 'undefined') {
            const relationId = isObject(data.role) ? data.role.id : undefined;

            data.roleId = data.roleId || relationId;
        }

        delete data.role;
        delete data.realmId;

        if (typeof data.roleId !== 'string') {
            throw new ValidationError(buildErrorMessageForAttribute('roleId'));
        }

        Object.assign(data, await this.validator.run(data, { group: ValidatorGroup.CREATE }));

        await this.repository.validateJoinColumns(data);

        if (typeof data.name === 'string' && this.reservedNames.has(data.name)) {
            throw new ValidationError(`The role-attribute name '${data.name}' collides with a Role entity column.`);
        }

        if (!isObject(data.role)) {
            throw new EntityNotFoundError();
        }

        data.realmId = data.role.realmId;

        const entity = this.repository.create({
            name: data.name,
            value: data.value,
            roleId: data.roleId,
            realmId: data.realmId,
        });

        await evaluateRecord(actor.permissionEvaluator, {
            name: PermissionName.ROLE_UPDATE,
            realm: entity.realmId,
            data: { [BuiltInPolicyType.ATTRIBUTES]: { [data.name]: data.value } },
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

        Object.assign(data, await this.validator.run(data, { group: ValidatorGroup.UPDATE }));

        await this.repository.validateJoinColumns(data);

        if (typeof data.name === 'string' && this.reservedNames.has(data.name)) {
            throw new ValidationError(`The role-attribute name '${data.name}' collides with a Role entity column.`);
        }

        let entity = await this.repository.findOneBy({ id });

        if (!entity) {
            throw new EntityNotFoundError();
        }

        // Only the name and value are writable: the id, the owner and the
        // role-derived realmId are IMMUTABLE on update. A new owner would be
        // authorized against its realm instead of the stored one, a body
        // realmId would pick the realm ROLE_UPDATE is gated against, and a
        // body id would retarget the save onto another row. To move an
        // attribute, delete + recreate.
        const current = { [entity.name]: entity.value };

        const patch: Partial<RoleAttribute> = {};

        if (typeof data.name !== 'undefined') {
            patch.name = data.name;
        }

        if (typeof data.value !== 'undefined') {
            patch.value = data.value;
        }

        entity = this.repository.merge(entity, patch);

        const realmId = entity.realmId ?? null;

        await this.evaluateUpdate(
            actor,
            PermissionName.ROLE_UPDATE,
            current,
            { [entity.name]: entity.value },
            { realm: () => realmId },
        );

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

        await evaluateRecord(actor.permissionEvaluator, {
            name: PermissionName.ROLE_UPDATE,
            realm: entity.realmId,
            data: { [BuiltInPolicyType.ATTRIBUTES]: entity },
        });

        const { id: entityId } = entity;

        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
