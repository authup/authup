/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, definePolicyData } from '@authup/access';
import { EntityNotFoundError } from '@authup/errors';
import type { IdentityProviderAccount } from '@authup/core-kit';
import {
    EventName, 
    EventRefType, 
    EventScope, 
    IdentityType, 
    PermissionName,
} from '@authup/core-kit';
import { AbstractEntityService } from '@authup/server-kit';
import type { ActorContext, EntityRepositoryFindManyResult } from '@authup/server-kit';
import { decodeQuery } from '../../query/index.ts';
import type { IUserIdentityRepository } from '../../identity/entities/user/types.ts';
import type { EventRequestContext, IEventService } from '../event/index.ts';
import { IdentityProviderAccountUnlinkBlockedError } from './error.ts';
import { identityProviderAccountSchema } from './schema.ts';
import type {
    IIdentityProviderAccountRepository,
    IIdentityProviderAccountService,
    IdentityProviderAccountServiceReadOptions,
} from './types.ts';

export type IdentityProviderAccountServiceContext = {
    repository: IIdentityProviderAccountRepository,
    userRepository: IUserIdentityRepository,
    eventService?: IEventService,
    requestContext?: () => EventRequestContext | undefined,
};

export class IdentityProviderAccountService extends AbstractEntityService implements IIdentityProviderAccountService {
    protected repository: IIdentityProviderAccountRepository;

    protected userRepository: IUserIdentityRepository;

    protected eventService?: IEventService;

    protected requestContext?: () => EventRequestContext | undefined;

    constructor(ctx: IdentityProviderAccountServiceContext) {
        super();
        this.repository = ctx.repository;
        this.userRepository = ctx.userRepository;
        this.eventService = ctx.eventService;
        this.requestContext = ctx.requestContext;
    }

    protected isOwnedBy(entity: IdentityProviderAccount, actor: ActorContext): boolean {
        return !!actor.identity &&
            actor.identity.type === IdentityType.USER &&
            entity.userId === actor.identity.data.id;
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
        options: IdentityProviderAccountServiceReadOptions = {},
    ): Promise<EntityRepositoryFindManyResult<IdentityProviderAccount>> {
        const parsed = await decodeQuery(query, { schema: identityProviderAccountSchema, actor });

        let canReadAll = true;
        try {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.IDENTITY_PROVIDER_ACCOUNT_READ });
        } catch (e) {
            // Rows are always user-owned, so only a user identity has a
            // self-service scope to fall back to.
            if (!actor.identity || actor.identity.type !== IdentityType.USER) {
                throw e;
            }
            canReadAll = false;
        }

        if (!canReadAll) {
            return this.repository.findMany(parsed, {
                userId: actor.identity!.data.id,
                ...(options.realmId ? { realmId: options.realmId } : {}),
            });
        }

        // No compile() WHERE-pushdown here: the compiled realm-reach
        // condition binds the row's `realmId` column and this entity
        // carries none (the owner realm is `userRealmId`), so the per-row
        // evaluation below is the sound path.
        const { data: entities, meta } = await this.repository.findMany(parsed, { ...(options.realmId ? { realmId: options.realmId } : {}) });

        const data: IdentityProviderAccount[] = [];
        let { total } = meta;

        for (const entity of entities) {
            if (this.isOwnedBy(entity, actor)) {
                data.push(entity);
                continue;
            }

            try {
                await actor.permissionEvaluator.evaluate({
                    name: PermissionName.IDENTITY_PROVIDER_ACCOUNT_READ,
                    data: definePolicyData({
                        [BuiltInPolicyType.ATTRIBUTES]: entity,
                        [BuiltInPolicyType.REALM_MATCH]: entity.userRealmId ?? null,
                    }),
                });
                data.push(entity);
            } catch {
                total -= 1;
            }
        }

        return { data, meta: { ...meta, total } };
    }

    async getOne(
        id: string,
        actor: ActorContext,
        options: IdentityProviderAccountServiceReadOptions = {},
    ): Promise<IdentityProviderAccount> {
        const entity = await this.repository.findOneById(id);
        if (!entity || (options.realmId && entity.userRealmId !== options.realmId)) {
            // A realm mismatch on the nested mount fails as not-found (no
            // cross-realm existence oracle).
            throw new EntityNotFoundError();
        }

        if (!this.isOwnedBy(entity, actor)) {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.IDENTITY_PROVIDER_ACCOUNT_READ });
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.IDENTITY_PROVIDER_ACCOUNT_READ,
                data: definePolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: entity,
                    [BuiltInPolicyType.REALM_MATCH]: entity.userRealmId ?? null,
                }),
            });
        }

        return entity;
    }

    async delete(
        id: string,
        actor: ActorContext,
        options: IdentityProviderAccountServiceReadOptions = {},
    ): Promise<IdentityProviderAccount> {
        const entity = await this.repository.findOneById(id);
        if (!entity || (options.realmId && entity.userRealmId !== options.realmId)) {
            throw new EntityNotFoundError();
        }

        if (!this.isOwnedBy(entity, actor)) {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.IDENTITY_PROVIDER_ACCOUNT_DELETE });
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.IDENTITY_PROVIDER_ACCOUNT_DELETE,
                data: definePolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: entity,
                    [BuiltInPolicyType.REALM_MATCH]: entity.userRealmId ?? null,
                }),
            });
        }

        // Lockout guard, enforced for EVERY caller (admin included): the
        // last linked account of a password-less user is their only way
        // in. An admin sets a password for the user first. Best-effort
        // check-then-act (no row lock): two concurrent deletes of a
        // password-less user's last two links could both pass and lock the
        // account out — a self-inflicted, admin-recoverable race (password
        // reset), not a privilege boundary.
        const count = await this.repository.countByUserId(entity.userId);
        if (count <= 1) {
            const user = await this.userRepository.findOneById(entity.userId);
            if (user && !user.password) {
                throw new IdentityProviderAccountUnlinkBlockedError();
            }
        }

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        const requestContext = this.requestContext ?
            this.requestContext() :
            undefined;

        await this.eventService?.record({
            scope: EventScope.IDENTITY,
            name: EventName.IDENTITY_PROVIDER_UNLINKED,
            refType: EventRefType.IDENTITY_PROVIDER_ACCOUNT,
            refId: entityId,
            realmId: entity.userRealmId ?? null,
            actorType: actor.identity?.type ?? null,
            actorId: actor.identity?.data.id ?? null,
            actorName: actor.identity?.data.name ?? null,
            requestPath: requestContext?.requestPath ?? null,
            requestMethod: requestContext?.requestMethod ?? null,
            requestIpAddress: requestContext?.requestIpAddress ?? null,
            requestUserAgent: requestContext?.requestUserAgent ?? null,
            data: { providerId: entity.providerId },
        });

        return entity;
    }
}
