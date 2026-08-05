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
    isFilter,
    isFilters,
} from '@rapiq/core';
import { PermissionName } from '@authup/core-kit';
import type { Session, SessionToken } from '@authup/core-kit';
import { AbstractEntityService } from '@authup/server-kit';
import type { ActorContext, EntityRepositoryFindManyResult } from '@authup/server-kit';
import type { IOAuth2TokenRepository, ISessionTokenRepository  } from '../../oauth2/index.ts';
import { appendQueryConditions, decodeQuery } from '../../query/index.ts';
import { sessionTokenSchema } from './schema.ts';
import type { ISessionTokenService, SessionTokenDeleteManyResult } from './types.ts';

/**
 * Filter keys that make a bulk revoke a TARGETED one. A query carrying none of
 * them is rejected rather than treated as "everything": unlike the session
 * bulk revoke, there is no meaningful self-service fallback here, so an
 * unrecognized filter must fail loudly instead of silently widening.
 */
export const SESSION_TOKEN_FILTER_KEYS = [
    'id',
    'sessionId',
    'clientId',
] as const;

export type SessionTokenServiceContext = {
    repository: ISessionTokenRepository,
    tokenRepository?: IOAuth2TokenRepository,
};

export class SessionTokenService extends AbstractEntityService implements ISessionTokenService {
    protected repository: ISessionTokenRepository;

    protected tokenRepository?: IOAuth2TokenRepository;

    constructor(ctx: SessionTokenServiceContext) {
        super();
        this.repository = ctx.repository;
        this.tokenRepository = ctx.tokenRepository;
    }

    /**
     * A token row carries no subject of its own, so ownership resolves through
     * the joined session. A row whose session did not load fails closed.
     */
    protected isOwnedBy(entity: SessionToken, actor: ActorContext): boolean {
        const session = entity.session as Session | undefined;

        return !!actor.identity &&
            !!session &&
            session.sub === actor.identity.data.id &&
            session.subKind === actor.identity.type;
    }

    /**
     * The realm the row belongs to, taken from its session. Absent when the
     * session did not load, which leaves the realm factor neutral, so the
     * per-row permission check below is what denies.
     */
    protected tokenRealmMatch(entity: SessionToken) {
        const session = entity.session as Session | undefined;
        if (!session) {
            return {};
        }

        return this.resourceRealmMatch({ realmId: session.realmId });
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<SessionToken>> {
        const parsed = await decodeQuery(query, { schema: sessionTokenSchema, actor });

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
            // Self-service: mandatory ownership scope through the session,
            // AND-injected so a client filter cannot displace it.
            const scoped = appendQueryConditions(
                parsed,
                and(
                    eq('session.sub', actor.identity!.data.id),
                    eq('session.subKind', actor.identity!.type),
                ),
            );

            return this.repository.findMany(scoped);
        }

        const { data: entities, meta } = await this.repository.findMany(parsed);

        const data: SessionToken[] = [];
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
                        ...this.tokenRealmMatch(entity),
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

    async getOne(id: string, actor: ActorContext): Promise<SessionToken> {
        const entity = await this.loadOneForActor(id, actor, PermissionName.SESSION_READ);

        return entity;
    }

    async delete(id: string, actor: ActorContext): Promise<SessionToken> {
        const entity = await this.loadOneForActor(id, actor, PermissionName.SESSION_DELETE);

        await this.revoke(entity);

        return entity;
    }

    async deleteMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<SessionTokenDeleteManyResult> {
        if (!actor.identity) {
            throw new AuthupError({ code: ErrorCode.IDENTITY_UNAUTHORIZED, message: 'Authentication required.' });
        }

        if (!this.hasTargetFilter(query)) {
            throw new AuthupError({
                code: ErrorCode.BAD_REQUEST,
                message: 'A bulk revoke must be scoped by id, sessionId or clientId.',
            });
        }

        const parsed = await decodeQuery(query, {
            schema: sessionTokenSchema,
            parameters: ['filters'],
            actor,
        });

        let canDeleteAll = true;
        try {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.SESSION_DELETE });
        } catch {
            canDeleteAll = false;
        }

        const scoped = canDeleteAll ? parsed : appendQueryConditions(
            parsed,
            and(
                eq('session.sub', actor.identity.data.id),
                eq('session.subKind', actor.identity.type),
            ),
        );

        const entities = await this.repository.findAllByQuery(scoped);

        let count = 0;
        for (const entity of entities) {
            if (!this.isOwnedBy(entity, actor)) {
                try {
                    await actor.permissionEvaluator.evaluate({
                        name: PermissionName.SESSION_DELETE,
                        data: definePolicyData({
                            [BuiltInPolicyType.ATTRIBUTES]: entity,
                            ...this.tokenRealmMatch(entity),
                        }),
                    });
                } catch {
                    continue;
                }
            }

            await this.revoke(entity);
            count += 1;
        }

        return { count };
    }

    // -----------------------------------------------------

    protected async loadOneForActor(
        id: string,
        actor: ActorContext,
        permission: `${PermissionName}`,
    ): Promise<SessionToken> {
        const entity = await this.repository.findOneWithSessionById(id);

        if (!entity) {
            throw new EntityNotFoundError();
        }

        if (!this.isOwnedBy(entity, actor)) {
            await actor.permissionEvaluator.preEvaluate({ name: permission });
            await actor.permissionEvaluator.evaluate({
                name: permission,
                data: definePolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: entity,
                    ...this.tokenRealmMatch(entity),
                }),
            });
        }

        return entity;
    }

    /**
     * Revoke, not delete. The row is stamped and the jti is blocklisted with a
     * TTL pinned to the token's real expiry, so an in-flight access token stops
     * introspecting as active instead of surviving to its own `exp`.
     */
    protected async revoke(entity: SessionToken): Promise<void> {
        await this.repository.revokeById(entity.id, new Date().toISOString());

        if (this.tokenRepository) {
            await this.tokenRepository.setInactive(
                entity.id,
                Math.floor(new Date(entity.expiresAt).getTime() / 1000),
            );
        }
    }

    protected hasTargetFilter(query?: Record<string, any>): boolean {
        if (!isObject(query)) {
            return false;
        }

        let parsed;
        try {
            parsed = SessionTokenService.queryCodec.decode(query);
        } catch {
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
            return (SESSION_TOKEN_FILTER_KEYS as readonly string[]).includes(condition.field) &&
                condition.value !== '';
        }

        return false;
    }

    /**
     * Schemaless decode — dialect detection only. The allow-list is enforced
     * downstream by the schema-bound decode.
     */
    protected static queryCodec = createURLCodec();
}
