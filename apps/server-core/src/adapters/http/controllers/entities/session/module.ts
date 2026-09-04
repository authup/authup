/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DContext,
    DController,
    DDelete,
    DGet,
    DPath,
    DTags,
} from '@routup/decorators';
import type { Session } from '@authup/core-kit';
import type { IAppEvent } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type { EntityCollectionResponse, EntityRecordResponse, SessionDeleteManyResponse } from '@authup/core-http-kit';
import { isSelfToken } from '../../../../../utils/index.ts';
import type { 
    IIdentityPermissionProvider, 
    IIdentityResolver, 
    ISessionRepository, 
    ISessionService,  
} from '../../../../../core/index.ts';
import {
    RECORD_QUERY_PARAMETERS,
    SESSION_COOKIE,
    deriveAmrAcr, 
    describeQuerySchema, 
    resolveIntrospectionSubject, 
    sessionSchema, 
} from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { buildActorContext, useRequestIdentity, useRequestSessionId } from '../../../request/index.ts';
import { IdentityType } from '@authup/core-kit';
import type { OAuth2TokenIntrospectionResponse } from '@authup/specs';
import { OAuth2SubKind, serializeOAuth2Scope } from '@authup/specs';
import { useRequestCookie } from '@routup/basic/cookie';
import { SYSTEM_CLIENT_SCOPE_NAMES } from '../../../../../core/entities/client/system-clients.ts';
import { unsetSessionCookie } from '../../../cookie/index.ts';

export type SessionControllerContext = {
    /**
     * Only the cookie-session additions below use these (plan 088). The entity
     * routes delegate wholly to `service`, as every entity controller does.
     */
    baseURL?: string,
    identityResolver?: IIdentityResolver,
    identityPermissionProvider?: IIdentityPermissionProvider,
    sessionRepository?: ISessionRepository,
    service: ISessionService,
};

@DTags('session')
@DController(['/sessions', '/realms/:realmId/sessions'])
export class SessionController {
    protected service: ISessionService;

    protected baseURL?: string;

    protected identityResolver?: IIdentityResolver;

    protected identityPermissionProvider?: IIdentityPermissionProvider;

    protected sessionRepository?: ISessionRepository;

    constructor(ctx: SessionControllerContext) {
        this.service = ctx.service;
        this.baseURL = ctx.baseURL;
        this.identityResolver = ctx.identityResolver;
        this.identityPermissionProvider = ctx.identityPermissionProvider;
        this.sessionRepository = ctx.sessionRepository;
    }

    /**
     * The caller's own session as a CONTEXT rather than a row: the identity
     * claims and permission projection a console hydrates its store from, which
     * is what `POST /token/introspect` answers minus everything token-shaped.
     *
     * A sibling of `@me` rather than a replacement for it: `GET /sessions/@me`
     * returns the `auth_sessions` ROW, and a console needs the subject's claims
     * and permissions, which are not on it. Named `introspect` because it is
     * literally the introspection projection, keyed off the request's own
     * credential instead of a token in the body.
     *
     * No client scope on the permission read, deliberately.
     * `reduceBindingsByIdentityClient` keeps only permissions whose own
     * `clientId` matches the one passed, so naming a console's client would
     * drop every global permission — nearly all of them. The bearer path passes
     * the token's `client_id` because a token IS issued to one client; a
     * session is not.
     */
    @DGet('/@me/introspect', [ForceLoggedInMiddleware])
    async getOwnIntrospection(
        @DContext() event: IAppEvent,
    ): Promise<OAuth2TokenIntrospectionResponse> {
        // A per-user document whose only discriminator may be an opaque
        // cookie, which is exactly what an intermediary can cross-serve.
        // `vary` is APPENDED because @routup/cors already put `origin` there.
        event.response.headers.set('cache-control', 'no-store');
        event.response.headers.append('vary', 'cookie');

        const identity = useRequestIdentity(event);
        const sessionId = useRequestSessionId(event);

        if (
            !identity ||
            !sessionId ||
            identity.type !== IdentityType.USER ||
            !this.identityResolver ||
            !this.identityPermissionProvider
        ) {
            return { active: false };
        }

        const actor = buildActorContext(event);
        const session = await this.service.getOne(sessionId, actor);
        if (!session) {
            return { active: false };
        }

        const subject = await resolveIntrospectionSubject({
            identityResolver: this.identityResolver,
            identityPermissionProvider: this.identityPermissionProvider,
        }, {
            sub: identity.id,
            subKind: identity.type,
            realmId: identity.realmId,
            active: true,
        });

        return {
            active: true,
            // todo: permissions property should be removed.
            permissions: subject.permissions,
            sub: identity.id,
            sub_kind: OAuth2SubKind.USER,
            session_id: session.id,
            realm_id: identity.realmId,
            realm_name: identity.realmName,
            scope: serializeOAuth2Scope(SYSTEM_CLIENT_SCOPE_NAMES),
            ...deriveAmrAcr(session),
            ...subject.claims,
        };
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<Session>> {
        const actor = buildActorContext(event);
        const {
            data,
            meta,
        } = await this.service.getMany(useRequestQuery(event), actor);

        return {
            data,
            meta: {
                ...meta,
                schema: describeQuerySchema(sessionSchema),
            },
        };
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<Session>> {
        const actor = buildActorContext(event);

        // `@me` / `@self` resolve to the caller's current session.
        const resolvedId = isSelfToken(id) ? (useRequestSessionId(event) ?? id) : id;

        const entity = await this.service.getOne(resolvedId, actor);

        return { data: entity, meta: { schema: describeQuerySchema(sessionSchema, RECORD_QUERY_PARAMETERS) } };
    }

    @DDelete('', [ForceLoggedInMiddleware])
    async dropMany(
        @DContext() event: IAppEvent,
    ): Promise<SessionDeleteManyResponse> {
        const actor = buildActorContext(event);

        // A recognized target filter (e.g. `?filter[userId]=<uuid>`) → admin
        // force-logout (SESSION_DELETE + per-session realm-match). No filter →
        // self-service "log out my other devices" (keeps the current session).
        const result = await this.service.deleteMany(actor, {
            query: useRequestQuery(event),
            currentSessionId: useRequestSessionId(event),
        });

        event.response.status = 202;
        return result;
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<Session>> {
        const actor = buildActorContext(event);

        const resolvedId = isSelfToken(id) ? (useRequestSessionId(event) ?? id) : id;
        const entity = await this.service.delete(resolvedId, actor);

        // Sign-out for a cookie session, folded in here rather than given its
        // own route (plan 088). Revoking the row was always most of the job;
        // the reason this endpoint could not BE the sign-out was that it left
        // a dead cookie the browser kept presenting on every request. Clearing
        // it removes that, and the same-origin gate is already upstream: a
        // cookie only authenticates at all when the middleware accepted it.
        // Only for the caller's OWN session: revoking another device must not
        // drop the credential of the one doing the revoking.
        if (
            this.baseURL &&
            resolvedId === useRequestSessionId(event) &&
            useRequestCookie(event, SESSION_COOKIE)
        ) {
            unsetSessionCookie(event, this.baseURL);
        }

        event.response.status = 202;
        return { data: entity, meta: {} };
    }
}
