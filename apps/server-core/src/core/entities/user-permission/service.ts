/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { UserPermission } from '@authup/core-kit';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';
import type { ActorContext } from '../actor/types.ts';
import { AbstractEntityService } from '../service.ts';
import type { EntityRepositoryFindManyResult } from '../types.ts';
import type { IUserPermissionRepository, IUserPermissionService } from './types.ts';

export type UserPermissionServiceContext = {
    repository: IUserPermissionRepository;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export class UserPermissionService extends AbstractEntityService implements IUserPermissionService {
    protected repository: IUserPermissionRepository;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    constructor(ctx: UserPermissionServiceContext) {
        super();
        this.repository = ctx.repository;
        this.identityPermissionProvider = ctx.identityPermissionProvider;
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<UserPermission>> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.USER_PERMISSION_CREATE,
                PermissionName.USER_PERMISSION_DELETE,
                PermissionName.USER_PERMISSION_READ,
            ],
        });

        return this.repository.findMany(query);
    }

    async getOne(
        id: string,
        actor: ActorContext,
    ): Promise<UserPermission> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.USER_PERMISSION_CREATE,
                PermissionName.USER_PERMISSION_DELETE,
                PermissionName.USER_PERMISSION_READ,
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
    ): Promise<UserPermission> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_PERMISSION_CREATE });

        await this.repository.validateJoinColumns(data);

        if (data.permission) {
            data.permission_realm_id = data.permission.realm_id;

            await actor.permissionEvaluator.preEvaluate({
                name: data.permission.name,
                realmId: data.permission.realm_id,
                clientId: data.permission.client_id,
            });
        }

        if (data.user) {
            data.user_realm_id = data.user.realm_id;
        }

        if (
            data.permission &&
            actor.identity &&
            typeof data.policy_id === 'undefined'
        ) {
            const junctionPolicy = await this.identityPermissionProvider.resolveJunctionPolicy(
                { type: actor.identity.type, id: actor.identity.data.id },
                {
                    name: data.permission.name,
                    realmId: data.permission.realm_id,
                    clientId: data.permission.client_id,
                },
            );
            if (junctionPolicy) {
                data.policy_id = junctionPolicy.id;
            }
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.USER_PERMISSION_CREATE,
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
    ): Promise<UserPermission> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_PERMISSION_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new NotFoundError();
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.USER_PERMISSION_DELETE,
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
