/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, definePolicyData } from '@authup/access';
import { EntityNotFoundError, UnauthorizedError } from '@authup/errors';
import { isObject } from '@authup/kit';
import { PermissionName } from '@authup/core-kit';
import type { Session } from '@authup/core-kit';
import { AbstractEntityService } from '@authup/server-kit';
import type { ActorContext, EntityRepositoryFindManyResult } from '@authup/server-kit';
import type { ISessionRepository } from '../../authentication/index.ts';
import { SESSION_FILTER_KEYS } from '../../authentication/index.ts';
import type { ISessionService, SessionDeleteManyOptions, SessionDeleteManyResult } from './types.ts';

export type SessionServiceContext = {
    repository: ISessionRepository,
};

export class SessionService extends AbstractEntityService implements ISessionService {
    protected repository: ISessionRepository;

    constructor(ctx: SessionServiceContext) {
        super();
        this.repository = ctx.repository;
    }

    protected isOwnedBy(session: Session, actor: ActorContext): boolean {
        return !!actor.identity &&
            session.sub === actor.identity.data.id &&
            session.sub_kind === actor.identity.type;
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<Session>> {
        let canReadAll = true;
        try {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.SESSION_READ });
        } catch (e) {
            if (!actor.identity) {
                throw e;
            }
            canReadAll = false;
        }

        if (!canReadAll) {
            // self-service: only the actor's own sessions
            return this.repository.findMany(query, {
                owner: {
                    sub: actor.identity!.data.id,
                    subKind: actor.identity!.type,
                },
            });
        }

        const { data: entities, meta } = await this.repository.findMany(query);

        const data: Session[] = [];
        let { total } = meta;

        for (const entity of entities) {
            if (this.isOwnedBy(entity, actor)) {
                data.push(entity);
                continue;
            }

            try {
                await actor.permissionEvaluator.evaluate({
                    name: PermissionName.SESSION_READ,
                    data: definePolicyData({
                        [BuiltInPolicyType.ATTRIBUTES]: entity,
                        ...this.resourceRealmMatch(entity),
                    }),
                });
                data.push(entity);
            } catch {
                total -= 1;
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

    async getOne(id: string, actor: ActorContext): Promise<Session> {
        const entity = await this.repository.findOneById(id);
        if (!entity) {
            throw new EntityNotFoundError();
        }

        if (!this.isOwnedBy(entity, actor)) {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.SESSION_READ });
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.SESSION_READ,
                data: definePolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: entity,
                    ...this.resourceRealmMatch(entity),
                }),
            });
        }

        return entity;
    }

    async delete(id: string, actor: ActorContext): Promise<Session> {
        const entity = await this.repository.findOneById(id);
        if (!entity) {
            throw new EntityNotFoundError();
        }

        if (!this.isOwnedBy(entity, actor)) {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.SESSION_DELETE });
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.SESSION_DELETE,
                data: definePolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: entity,
                    ...this.resourceRealmMatch(entity),
                }),
            });
        }

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }

    async deleteMany(
        actor: ActorContext,
        options: SessionDeleteManyOptions = {},
    ): Promise<SessionDeleteManyResult> {
        if (!actor.identity) {
            throw new UnauthorizedError();
        }

        if (this.hasTargetFilter(options.query)) {
            return this.deleteManyByQuery(actor, options.query!);
        }

        return this.deleteManyForSelf(actor, options.currentSessionId);
    }

    /**
     * True when the query carries at least one recognized target filter — the
     * discriminator between the admin bulk-revoke path and self-service. An
     * unrecognized / empty filter falls through to self-service (fail-safe: a
     * typo can never trigger an unconstrained mass delete).
     */
    protected hasTargetFilter(query?: Record<string, any>): boolean {
        const filter = query?.filter;
        if (!isObject(filter)) {
            return false;
        }

        return SESSION_FILTER_KEYS.some((key) => {
            const value = filter[key];
            return typeof value !== 'undefined' && value !== '';
        });
    }

    protected async deleteManyForSelf(
        actor: ActorContext,
        currentSessionId?: string,
    ): Promise<SessionDeleteManyResult> {
        const sessions = await this.repository.findAllByOwner({
            sub: actor.identity!.data.id,
            subKind: actor.identity!.type,
        });

        let count = 0;
        for (const session of sessions) {
            if (currentSessionId && session.id === currentSessionId) {
                continue;
            }
            await this.repository.remove(session);
            count += 1;
        }

        return { count };
    }

    protected async deleteManyByQuery(
        actor: ActorContext,
        query: Record<string, any>,
    ): Promise<SessionDeleteManyResult> {
        // Gate: an actor without SESSION_DELETE cannot force-logout anyone → 403.
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.SESSION_DELETE });

        const sessions = await this.repository.findAllByQuery(query);

        let count = 0;
        for (const session of sessions) {
            // Own sessions are always deletable by the actor (mirrors getMany).
            // Otherwise per-session realm-match: a realm_admin only reaches
            // sessions in its realm — cross-realm rows are skipped, not failed,
            // so filter breadth cannot escalate beyond the actor's reach.
            if (!this.isOwnedBy(session, actor)) {
                try {
                    await actor.permissionEvaluator.evaluate({
                        name: PermissionName.SESSION_DELETE,
                        data: definePolicyData({
                            [BuiltInPolicyType.ATTRIBUTES]: session,
                            ...this.resourceRealmMatch(session),
                        }),
                    });
                } catch {
                    continue;
                }
            }

            await this.repository.remove(session);
            count += 1;
        }

        return { count };
    }
}
