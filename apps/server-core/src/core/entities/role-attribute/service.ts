/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { RoleAttribute } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import { AbstractEntityService } from '../service.ts';
import type { EntityRepositoryFindManyResult } from '../types.ts';
import type { IRoleAttributeRepository, IRoleAttributeService } from './types.ts';

export type RoleAttributeServiceContext = {
    repository: IRoleAttributeRepository;
};

export class RoleAttributeService extends AbstractEntityService implements IRoleAttributeService {
    protected repository: IRoleAttributeRepository;

    constructor(ctx: RoleAttributeServiceContext) {
        super();
        this.repository = ctx.repository;
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<RoleAttribute>> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.ROLE_READ,
                PermissionName.ROLE_UPDATE,
                PermissionName.ROLE_DELETE,
            ],
        });

        const {
            data: entities, 
            meta, 
        } = await this.repository.findMany(query);

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
                    input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity }),
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
            throw new NotFoundError();
        }

        await actor.permissionEvaluator.evaluateOneOf({
            name: [
                PermissionName.ROLE_READ,
                PermissionName.ROLE_UPDATE,
                PermissionName.ROLE_DELETE,
            ],
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity }),
        });

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<RoleAttribute> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROLE_UPDATE });

        await this.repository.validateJoinColumns(data);

        data.realm_id = data.role.realm_id;

        const entity = this.repository.create(data);

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROLE_UPDATE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity }),
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

        let entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new NotFoundError();
        }

        entity = this.repository.merge(entity, data);

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROLE_UPDATE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity }),
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
            throw new NotFoundError();
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROLE_UPDATE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
