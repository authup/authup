/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { ConflictError, ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName, UserRoleValidator, ValidatorGroup } from '@authup/core-kit';
import type { UserRole } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import { AbstractEntityService } from '../service.ts';
import type { EntityRepositoryFindManyResult } from '../types.ts';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';
import type { IUserRoleRepository, IUserRoleService } from './types.ts';

export type UserRoleServiceContext = {
    repository: IUserRoleRepository;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export class UserRoleService extends AbstractEntityService implements IUserRoleService {
    protected repository: IUserRoleRepository;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    protected validator: UserRoleValidator;

    constructor(ctx: UserRoleServiceContext) {
        super();
        this.repository = ctx.repository;
        this.identityPermissionProvider = ctx.identityPermissionProvider;
        this.validator = new UserRoleValidator();
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

        const validated = await this.validator.run(data, { group: ValidatorGroup.CREATE });

        await this.repository.validateJoinColumns(validated);

        const existing = await this.repository.findOneBy({
            role_id: validated.role_id,
            user_id: validated.user_id,
        });
        if (existing) {
            throw new ConflictError('The user-role assignment already exists.');
        }

        if (validated.role) {
            validated.role_realm_id = validated.role.realm_id;
        }

        if (validated.user) {
            validated.user_realm_id = validated.user.realm_id;
        }

        if (validated.role && actor.identity) {
            const hasPermissions = await this.identityPermissionProvider.isSuperset(
                {
                    type: actor.identity.type,
                    id: actor.identity.data.id,
                },
                {
                    type: 'role',
                    id: validated.role_id,
                    clientId: validated.role.client_id,
                },
            );
            if (!hasPermissions) {
                throw new ForbiddenError('You don\'t own the required permissions.');
            }
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.USER_ROLE_CREATE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: validated }),
        });

        let entity = this.repository.create(validated);
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
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
