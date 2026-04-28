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
    reservedNames?: ReadonlySet<string>;
};

export class UserAttributeService extends AbstractEntityService implements IUserAttributeService {
    protected repository: IUserAttributeRepository;

    protected reservedNames: ReadonlySet<string>;

    constructor(ctx: UserAttributeServiceContext) {
        super();
        this.repository = ctx.repository;
        this.reservedNames = ctx.reservedNames ?? new Set();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<UserAttribute>> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.USER_UPDATE,
                PermissionName.USER_SELF_MANAGE,
            ],
        });

        const {
            data: entities,
            meta,
        } = await this.repository.findMany(query);

        const data: UserAttribute[] = [];
        let { total } = meta;

        for (const entity of entities) {
            const canRead = await this.canReadUserAttribute(actor, entity);
            if (canRead) {
                data.push(entity);
            } else {
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
    ): Promise<UserAttribute> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.USER_UPDATE,
                PermissionName.USER_SELF_MANAGE,
            ],
        });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new NotFoundError();
        }

        const canRead = await this.canReadUserAttribute(actor, entity);
        if (!canRead) {
            throw new ForbiddenError();
        }

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<UserAttribute> {
        const targetUserId: string | undefined = data.user_id ||
            (data.user && data.user.id);

        const isSelfTarget = !!actor.identity &&
            actor.identity.type === 'user' &&
            (!targetUserId || targetUserId === actor.identity.data.id);

        let isSelfFallback = false;
        try {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_UPDATE });
        } catch (e) {
            if (!isSelfTarget) {
                throw e;
            }
            isSelfFallback = true;
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_SELF_MANAGE });
        }

        await this.repository.validateJoinColumns(data);

        if (typeof data.name === 'string' && this.reservedNames.has(data.name)) {
            throw new BadRequestError(`The user-attribute name '${data.name}' collides with a User entity column.`);
        }

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

        if (isSelfFallback) {
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.USER_SELF_MANAGE,
                input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: { [data.name]: data.value } }),
            });
        } else {
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.USER_UPDATE,
                input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity }),
            });
        }

        await this.repository.save(entity);

        return entity;
    }

    async update(
        id: string,
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<UserAttribute> {
        await this.repository.validateJoinColumns(data);

        if (typeof data.name === 'string' && this.reservedNames.has(data.name)) {
            throw new BadRequestError(`The user-attribute name '${data.name}' collides with a User entity column.`);
        }

        let entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new NotFoundError();
        }

        const isSelfTarget = !!actor.identity &&
            actor.identity.type === 'user' &&
            actor.identity.data.id === entity.user_id;

        let isSelfFallback = false;
        try {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_UPDATE });
        } catch (e) {
            if (!isSelfTarget) {
                throw e;
            }
            isSelfFallback = true;
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_SELF_MANAGE });
        }

        entity = this.repository.merge(entity, data);

        if (isSelfFallback) {
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.USER_SELF_MANAGE,
                input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: { [entity.name]: entity.value } }),
            });
        } else {
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.USER_UPDATE,
                input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity }),
            });
        }

        await this.repository.save(entity);

        return entity;
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<UserAttribute> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.USER_UPDATE,
                PermissionName.USER_SELF_MANAGE,
            ],
        });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new NotFoundError();
        }

        const canRead = await this.canReadUserAttribute(actor, entity);
        if (!canRead) {
            throw new ForbiddenError();
        }

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }

    private async canReadUserAttribute(
        actor: ActorContext,
        entity: UserAttribute,
    ): Promise<boolean> {
        const isMe = actor.identity &&
            actor.identity.type === 'user' &&
            actor.identity.data.id === entity.user_id;

        if (isMe) {
            return true;
        }

        try {
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.USER_UPDATE,
                input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity }),
            });

            return true;
        } catch {
            return false;
        }
    }
}
