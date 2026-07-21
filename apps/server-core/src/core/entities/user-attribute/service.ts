/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PermissionError, definePolicyData } from '@authup/access';
import { EntityNotFoundError, ValidationError } from '@authup/errors';
import { eq, inArray, or } from '@rapiq/core';
import { PermissionName } from '@authup/core-kit';
import type { UserAttribute } from '@authup/core-kit';
import { buildErrorMessageForAttribute } from 'validup';
import type { ActorContext, EntityRepositoryFindManyResult  } from '@authup/server-kit';
import { AbstractEntityService } from '@authup/server-kit';
import type { IUserAttributeRepository, IUserAttributeService } from './types.ts';
import { appendQueryConditions, decodeQuery } from '../../query/index.ts';
import { userAttributeSchema } from './schema.ts';

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

        const parsed = await decodeQuery(query, { schema: userAttributeSchema, actor });

        // Compile the foreign-row gate into a row condition (#3286 phase 3),
        // mirroring canReadUserAttribute: own rows (the actor's userId) are
        // always readable, foreign rows require USER_UPDATE. USER_SELF_MANAGE
        // is deliberately not compiled — its ATTRIBUTE_NAMES denylist policy is
        // non-lowerable, and the self leg is the ownership term anyway. A
        // non-expressible USER_UPDATE policy falls back to the per-row loop.
        const compiled = await actor.permissionEvaluator.compile({ name: PermissionName.USER_UPDATE });
        if (compiled.verdict !== 'post') {
            const self = actor.identity && actor.identity.type === 'user' ?
                eq('userId', actor.identity.data.id) :
                null;

            let scoped = parsed;
            if (compiled.verdict === 'deny') {
                scoped = appendQueryConditions(parsed, self ?? inArray('id', []));
            } else if (compiled.verdict === 'conditional') {
                scoped = appendQueryConditions(
                    parsed,
                    self ? or(self, compiled.condition) : compiled.condition,
                );
            }

            return this.repository.findMany(scoped);
        }

        const {
            data: entities,
            meta,
        } = await this.repository.findMany(parsed);

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
        const targetUserId: string | undefined = data.userId ||
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
            data.realmId = data.user.realmId;
        } else if (
            actor.identity &&
            actor.identity.type === 'user'
        ) {
            data.userId = actor.identity.data.id;
            data.realmId = actor.identity.data.realmId;
        } else {
            throw new ValidationError(buildErrorMessageForAttribute('userId'));
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
            actor.identity.data.id === entity.userId;

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

        // An attribute belongs to a fixed user; its owner (and the user-derived realmId) is
        // IMMUTABLE on update — strip both from the body. This blocks a self-manage or admin
        // caller from reassigning the attribute to another user (isSelfTarget was decided from
        // the ORIGINAL owner), and blocks a caller-supplied realmId that would gate USER_UPDATE
        // against a realm of their choosing. To move an attribute, delete + recreate.
        delete data.userId;
        delete data.user;
        delete data.realmId;

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
            actor.identity.data.id === entity.userId;

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
