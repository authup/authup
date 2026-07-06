/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, definePolicyData } from '@authup/access';
import { EntityNotFoundError, UnauthorizedError } from '@authup/errors';
import { PermissionName } from '@authup/core-kit';
import type { Session } from '@authup/core-kit';
import { AbstractEntityService } from '@authup/server-kit';
import type { ActorContext, EntityRepositoryFindManyResult } from '@authup/server-kit';
import type { ISessionRepository } from '../../authentication/index.ts';
import type { ISessionService, SessionDeleteManyResult } from './types.ts';

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

    async deleteManyForActor(
        actor: ActorContext,
        currentSessionId?: string,
    ): Promise<SessionDeleteManyResult> {
        if (!actor.identity) {
            throw new UnauthorizedError();
        }

        const sessions = await this.repository.findAllByOwner({
            sub: actor.identity.data.id,
            subKind: actor.identity.type,
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
}
