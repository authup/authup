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
import type { ISessionManager, ISessionRepository } from '../../authentication/index.ts';
import { SESSION_FILTER_KEYS } from '../../authentication/index.ts';
import type { ISessionService, SessionDeleteManyOptions, SessionDeleteManyResult } from './types.ts';
import { appendQueryConditions, decodeQuery } from '../../query/index.ts';
import { sessionSchema } from './schema.ts';

export type SessionServiceContext = {
    repository: ISessionRepository,
    /**
     * Every revoke goes through the manager rather than the repository: its
     * `revoke` is the one chokepoint that pushes the back-channel logout.
     */
    sessionManager: ISessionManager,
};

// below the default pool of ten: every revoke holds a connection
const SESSION_REVOKE_CONCURRENCY = 5;

export class SessionService extends AbstractEntityService implements ISessionService {
    protected repository: ISessionRepository;

    protected sessionManager: ISessionManager;

    constructor(ctx: SessionServiceContext) {
        super();
        this.repository = ctx.repository;
        this.sessionManager = ctx.sessionManager;
    }

    protected isOwnedBy(session: Session, actor: ActorContext): boolean {
        return !!actor.identity &&
            session.sub === actor.identity.data.id &&
            session.subKind === actor.identity.type;
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
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

            return this.repository.findMany(scoped);
        }

        const { data: entities, meta } = await this.repository.findMany(parsed);

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

        await this.sessionManager.revoke(entity.id);

        return entity;
    }

    async deleteMany(
        actor: ActorContext,
        options: SessionDeleteManyOptions = {},
    ): Promise<SessionDeleteManyResult> {
        if (!actor.identity) {
            throw new AuthupError({ code: ErrorCode.IDENTITY_UNAUTHORIZED, message: 'Authentication required.' });
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

        const toRevoke = sessions.filter((session) => !currentSessionId || session.id !== currentSessionId);

        await this.revokeAll(toRevoke);

        return { count: toRevoke.length };
    }

    protected async deleteManyByQuery(
        actor: ActorContext,
        query: Record<string, any>,
    ): Promise<SessionDeleteManyResult> {
        // Gate: an actor without SESSION_DELETE cannot force-logout anyone → 403.
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.SESSION_DELETE });

        const sessions = await this.repository.findAllByQuery(
            await decodeQuery(query, {
                schema: sessionSchema, 
                parameters: ['filters'], 
                actor, 
            }),
        );

        const toRevoke: Session[] = [];
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

            toRevoke.push(session);
        }

        await this.revokeAll(toRevoke);

        return { count: toRevoke.length };
    }

    /**
     * Revokes in batches. Every revoke waits for its back-channel deliveries,
     * so one at a time costs a hanging RP one timeout per session, while all
     * at once is an unbounded burst of row deletes and outbound requests.
     */
    protected async revokeAll(sessions: Session[]): Promise<void> {
        for (let i = 0; i < sessions.length; i += SESSION_REVOKE_CONCURRENCY) {
            await Promise.all(sessions
                .slice(i, i + SESSION_REVOKE_CONCURRENCY)
                .map((session) => this.sessionManager.revoke(session.id)));
        }
    }
}
