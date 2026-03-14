/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { UserAttribute } from '@authup/core-kit';
import { buildErrorMessageForAttribute } from 'validup';
import type { ActorContext } from '../actor/types.ts';
import { AbstractEntityService } from '../service.ts';
import type { EntityRepositoryFindManyResult } from '../types.ts';
import type { IUserAttributeRepository, IUserAttributeService } from './types.ts';

export type UserAttributeServiceContext = {
    repository: IUserAttributeRepository;
};

export class UserAttributeService extends AbstractEntityService implements IUserAttributeService {
    protected repository: IUserAttributeRepository;

    constructor(ctx: UserAttributeServiceContext) {
        super();
        this.repository = ctx.repository;
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<UserAttribute>> {
        await actor.permissionChecker.preCheckOneOf({
            name: [
                PermissionName.USER_UPDATE,
                PermissionName.USER_SELF_MANAGE,
            ],
        });

        const { data: entities, meta } = await this.repository.findMany(query);

        const data: UserAttribute[] = [];
        let { total } = meta;

        for (let i = 0; i < entities.length; i++) {
            const canManage = await this.canManageUserAttribute(actor, entities[i]);
            if (canManage) {
                data.push(entities[i]);
            } else {
                total--;
            }
        }

        return { data, meta: { ...meta, total } };
    }

    async getOne(
        id: string,
        actor: ActorContext,
    ): Promise<UserAttribute> {
        await actor.permissionChecker.preCheckOneOf({
            name: [
                PermissionName.USER_UPDATE,
                PermissionName.USER_SELF_MANAGE,
            ],
        });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new NotFoundError();
        }

        const canManage = await this.canManageUserAttribute(actor, entity);
        if (!canManage) {
            throw new ForbiddenError();
        }

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<UserAttribute> {
        await actor.permissionChecker.preCheckOneOf({
            name: [
                PermissionName.USER_UPDATE,
                PermissionName.USER_SELF_MANAGE,
            ],
        });

        await this.repository.validateJoinColumns(data);

        if (data.user) {
            data.realm_id = data.user.realm_id;
        } else if (
            actor.identity &&
            actor.identity.type === 'user'
        ) {
            data.user_id = actor.identity.data.id;
            data.realm_id = actor.identity.data.realm_id;
        } else {
            throw new BadRequestError(buildErrorMessageForAttribute('user_id'));
        }

        const entity = this.repository.create(data);

        const canManage = await this.canManageUserAttribute(actor, entity);
        if (!canManage) {
            throw new ForbiddenError();
        }

        await this.repository.save(entity);

        return entity;
    }

    async update(
        id: string,
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<UserAttribute> {
        await actor.permissionChecker.checkOneOf({
            name: [
                PermissionName.USER_UPDATE,
                PermissionName.USER_SELF_MANAGE,
            ],
        });

        await this.repository.validateJoinColumns(data);

        let entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new NotFoundError();
        }

        entity = this.repository.merge(entity, data);

        const canManage = await this.canManageUserAttribute(actor, entity);
        if (!canManage) {
            throw new ForbiddenError();
        }

        await this.repository.save(entity);

        return entity;
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<UserAttribute> {
        await actor.permissionChecker.preCheckOneOf({
            name: [
                PermissionName.USER_UPDATE,
                PermissionName.USER_SELF_MANAGE,
            ],
        });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new NotFoundError();
        }

        const canManage = await this.canManageUserAttribute(actor, entity);
        if (!canManage) {
            throw new ForbiddenError();
        }

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }

    private async canManageUserAttribute(
        actor: ActorContext,
        entity: UserAttribute,
    ): Promise<boolean> {
        const isMe = actor.identity &&
            actor.identity.type === 'user' &&
            actor.identity.data.id === entity.user_id;

        try {
            if (isMe) {
                await actor.permissionChecker.check({
                    name: PermissionName.USER_SELF_MANAGE,
                    input: new PolicyData({
                        [BuiltInPolicyType.ATTRIBUTES]: entity,
                    }),
                });

                return true;
            }
        } catch (e) {
            if (!isMe) {
                return false;
            }
        }

        if (!isMe) {
            try {
                await actor.permissionChecker.check({
                    name: PermissionName.USER_UPDATE,
                    input: new PolicyData({
                        [BuiltInPolicyType.ATTRIBUTES]: entity,
                    }),
                });
            } catch (e) {
                return false;
            }
        }

        return true;
    }
}
