/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { UserRole } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import { AbstractEntityService } from '../service.ts';
import type { EntityRepositoryFindManyResult } from '../types.ts';
import type { IUserRoleRepository, IUserRoleService } from './types.ts';

export type UserRoleServiceContext = {
    repository: IUserRoleRepository;
};

export class UserRoleService extends AbstractEntityService implements IUserRoleService {
    protected repository: IUserRoleRepository;

    constructor(ctx: UserRoleServiceContext) {
        super();
        this.repository = ctx.repository;
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<UserRole>> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.USER_ROLE_READ,
                PermissionName.USER_ROLE_CREATE,
                PermissionName.USER_ROLE_UPDATE,
            ],
        });

        return this.repository.findMany(query);
    }

    async getOne(
        id: string,
        actor: ActorContext,
    ): Promise<UserRole> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.USER_ROLE_READ,
                PermissionName.USER_ROLE_CREATE,
                PermissionName.USER_ROLE_UPDATE,
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
    ): Promise<UserRole> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_ROLE_CREATE });

        await this.repository.validateJoinColumns(data);

        if (data.role) {
            data.role_realm_id = data.role.realm_id;
        }

        if (data.user) {
            data.user_realm_id = data.user.realm_id;
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.USER_ROLE_CREATE,
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
    ): Promise<UserRole> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_ROLE_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new NotFoundError();
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.USER_ROLE_DELETE,
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
