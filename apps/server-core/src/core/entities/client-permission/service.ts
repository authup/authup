/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { ClientPermission } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import { AbstractEntityService } from '../service.ts';
import type { EntityRepositoryFindManyResult } from '../types.ts';
import type { IClientPermissionRepository, IClientPermissionService } from './types.ts';

export type ClientPermissionServiceContext = {
    repository: IClientPermissionRepository;
};

export class ClientPermissionService extends AbstractEntityService implements IClientPermissionService {
    protected repository: IClientPermissionRepository;

    constructor(ctx: ClientPermissionServiceContext) {
        super();
        this.repository = ctx.repository;
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<ClientPermission>> {
        await actor.permissionChecker.preCheckOneOf({
            name: [
                PermissionName.CLIENT_PERMISSION_CREATE,
                PermissionName.CLIENT_PERMISSION_DELETE,
            ],
        });

        return this.repository.findMany(query);
    }

    async getOne(
        id: string,
        actor: ActorContext,
    ): Promise<ClientPermission> {
        await actor.permissionChecker.preCheckOneOf({
            name: [
                PermissionName.CLIENT_PERMISSION_CREATE,
                PermissionName.CLIENT_PERMISSION_DELETE,
            ],
        });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new NotFoundError();
        }

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<ClientPermission> {
        await actor.permissionChecker.preCheck({ name: PermissionName.CLIENT_PERMISSION_CREATE });

        await this.repository.validateJoinColumns(data);

        if (data.permission) {
            data.permission_realm_id = data.permission.realm_id;

            await actor.permissionChecker.preCheck({
                name: data.permission.name,
            });
        }

        if (data.client) {
            data.client_realm_id = data.client.realm_id;
        }

        if (
            data.permission &&
            actor.resolveJunctionPolicy &&
            typeof data.policy_id === 'undefined'
        ) {
            const junctionPolicy = await actor.resolveJunctionPolicy(data.permission.name);
            if (junctionPolicy) {
                data.policy_id = junctionPolicy.id;
            }
        }

        await actor.permissionChecker.check({
            name: PermissionName.CLIENT_PERMISSION_CREATE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: data,
            }),
        });

        let entity = this.repository.create(data);
        entity = await this.repository.save(entity);

        return entity;
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<ClientPermission> {
        await actor.permissionChecker.preCheck({ name: PermissionName.CLIENT_PERMISSION_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new NotFoundError();
        }

        await actor.permissionChecker.check({
            name: PermissionName.CLIENT_PERMISSION_DELETE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: entity,
            }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
