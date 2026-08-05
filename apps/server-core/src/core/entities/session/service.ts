/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, definePolicyData } from '@authup/access';
import { AuthupError, EntityNotFoundError, ErrorCode } from '@authup/errors';
import { isObject } from '@authup/kit';
import { createURLCodec } from '@rapiq/codec-url';
import type { ICondition } from '@rapiq/core';
import {
    and, 
    eq, 
    inArray, 
    isFilter, 
    isFilters, 
    or,
} from '@rapiq/core';
import { PermissionName } from '@authup/core-kit';
import type { Session } from '@authup/core-kit';
import { AbstractEntityService } from '@authup/server-kit';
import type { ActorContext, EntityRepositoryFindManyResult } from '@authup/server-kit';
import type { ISessionRepository } from '../../authentication/index.ts';
import { SESSION_FILTER_KEYS } from '../../authentication/index.ts';
import type {
    ISessionService,
    SessionDeleteManyOptions,
    SessionDeleteManyResult,
    SessionGetManyOptions,
} from './types.ts';
import { appendQueryConditions, decodeQuery } from '../../query/index.ts';
import { sessionSchema } from './schema.ts';

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
            session.subKind === actor.identity.type;
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
        options: SessionGetManyOptions = {},
    ): Promise<EntityRepositoryFindManyResult<Session>> {
        const parsed = await decodeQuery(query, { schema: sessionSchema, actor });

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
            return this.repository.findMany(parsed, {
                owner: {
                    sub: actor.identity!.data.id,
                    subKind: actor.identity!.type,
                },
                clientIds: options.clientIds,
            });
        }

        // Compile SESSION_READ into a row condition (#3286 phase 3). Own sessions
        // are always readable, so ownership composes as an OR-alternative — the
        // whole gate runs as WHERE and pagination/totals stay exact. Only a
        // non-expressible policy falls back to the per-row loop below.
        const compiled = await actor.permissionEvaluator.compile({ name: PermissionName.SESSION_READ });
        if (compiled.verdict !== 'post') {
            const ownership = actor.identity ?
                and(eq('sub', actor.identity.data.id), eq('subKind', actor.identity.type)) :
                null;

            let scoped = parsed;
            if (compiled.verdict === 'deny') {
                scoped = appendQueryConditions(parsed, ownership ?? inArray('id', []));
            } else if (compiled.verdict === 'conditional') {
                scoped = appendQueryConditions(
                    parsed,
                    ownership ? or(ownership, compiled.condition) : compiled.condition,
                );
            }

            return this.repository.findMany(scoped, { clientIds: options.clientIds });
        }

        const { data: entities, meta } = await this.repository.findMany(
            parsed,
            { clientIds: options.clientIds },
        );

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
            throw new AuthupError({ code: ErrorCode.IDENTITY_UNAUTHORIZED, message: 'Authentication required.' });
        }

        // A `usedClientId` parameter targets just as precisely as a filter
        // does, so it selects the admin path on its own. Without this the
        // call would fall through to self-service and silently revoke the
        // caller's own devices instead of the named application's sessions.
        const clientIds = options.clientIds && options.clientIds.length > 0 ?
            options.clientIds :
            undefined;

        if (clientIds || this.hasTargetFilter(options.query)) {
            return this.deleteManyByQuery(actor, options.query ?? {}, clientIds);
        }

        return this.deleteManyForSelf(actor, options.currentSessionId);
    }

    /**
     * True when the query carries at least one recognized target filter — the
     * discriminator between the admin bulk-revoke path and self-service. An
     * unrecognized / empty filter falls through to self-service (fail-safe: a
     * typo can never trigger an unconstrained mass delete).
     *
     * The wire may carry either dialect (v2 expression or legacy bracket
     * filters), so the decision decodes to the rapiq IR and inspects the
     * condition tree instead of poking at the raw payload.
     */
    protected hasTargetFilter(query?: Record<string, any>): boolean {
        if (!isObject(query)) {
            return false;
        }

        let parsed;
        try {
            parsed = SessionService.queryCodec.decode(query);
        } catch {
            // unreadable filter — fail-safe to self-service
            return false;
        }

        if (!parsed) {
            return false;
        }

        return this.hasTargetCondition(parsed.filters);
    }

    protected hasTargetCondition(condition: ICondition): boolean {
        if (isFilters(condition)) {
            return condition.value.some((child) => this.hasTargetCondition(child));
        }

        if (isFilter(condition)) {
            return (SESSION_FILTER_KEYS as readonly string[]).includes(condition.field) &&
                condition.value !== '';
        }

        return false;
    }

    /**
     * Schemaless decode — dialect detection only. The allow-list is
     * enforced downstream by the repository's schema-bound decode.
     */
    protected static queryCodec = createURLCodec();

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
        clientIds?: string[],
    ): Promise<SessionDeleteManyResult> {
        // Gate: an actor without SESSION_DELETE cannot force-logout anyone → 403.
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.SESSION_DELETE });

        const sessions = await this.repository.findAllByQuery(
            await decodeQuery(query, {
                schema: sessionSchema, 
                parameters: ['filters'], 
                actor, 
            }),
            { clientIds },
        );

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
