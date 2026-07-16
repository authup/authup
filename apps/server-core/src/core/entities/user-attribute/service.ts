/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PermissionError, definePolicyData } from '@authup/access';
import { EntityNotFoundError, ValidationError } from '@authup/errors';
import { PermissionName } from '@authup/core-kit';
import type { UserAttribute } from '@authup/core-kit';
import { buildErrorMessageForAttribute } from 'validup';
import type { ActorContext, EntityRepositoryFindManyResult  } from '@authup/server-kit';
import { AbstractEntityService } from '@authup/server-kit';
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
            throw new EntityNotFoundError();
        }

        const canRead = await this.canReadUserAttribute(actor, entity);
        if (!canRead) {
            throw new PermissionError();
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
            throw new ValidationError(`The user-attribute name '${data.name}' collides with a User entity column.`);
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
            throw new ValidationError(buildErrorMessageForAttribute('user_id'));
        }

        const entity = this.repository.create(data);

        if (isSelfFallback) {
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.USER_SELF_MANAGE,
                data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: { [data.name]: data.value } }),
            });
        } else {
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.USER_UPDATE,
                data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity, ...this.resourceRealmMatch(entity) }),
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
            throw new ValidationError(`The user-attribute name '${data.name}' collides with a User entity column.`);
        }

        let entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
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

        // An attribute belongs to a fixed user; its owner (and the user-derived realm_id) is
        // IMMUTABLE on update — strip both from the body. This blocks a self-manage or admin
        // caller from reassigning the attribute to another user (isSelfTarget was decided from
        // the ORIGINAL owner), and blocks a caller-supplied realm_id that would gate USER_UPDATE
        // against a realm of their choosing. To move an attribute, delete + recreate.
        delete data.user_id;
        delete data.user;
        delete data.realm_id;

        entity = this.repository.merge(entity, data);

        if (isSelfFallback) {
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.USER_SELF_MANAGE,
                data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: { [entity.name]: entity.value } }),
            });
        } else {
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.USER_UPDATE,
                data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity, ...this.resourceRealmMatch(entity) }),
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
            throw new EntityNotFoundError();
        }

        const canRead = await this.canReadUserAttribute(actor, entity);
        if (!canRead) {
            throw new PermissionError();
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
                data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity, ...this.resourceRealmMatch(entity) }),
            });

            return true;
        } catch {
            return false;
        }
    }
}
