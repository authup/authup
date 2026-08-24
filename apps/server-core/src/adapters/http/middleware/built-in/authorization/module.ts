/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IPermissionEvaluator } from '@authup/access';
import { PermissionEvaluator } from '@authup/access';
import type { Client, Session, User } from '@authup/core-kit';
import {
    IdentityType,
    ScopeName,
} from '@authup/core-kit';
import { AuthHeaderError } from '@authup/errors';
import type { Logger } from '@authup/server-kit';
import { useRequestCookie } from '@routup/basic/cookie';
import type { OAuth2TokenPayload } from '@authup/specs';
import {
    JWTError,
    OAuth2SubKind,
    OAuth2TokenKind,
    deserializeOAuth2Scope,
} from '@authup/specs';
import type { IAppEvent } from 'routup';
import {
    AuthorizationHeaderType,
    type BasicAuthorizationHeader,
    type BearerAuthorizationHeader,
    parseAuthorizationHeader,
} from 'hapic';
import { setConsoleSessionCookie } from '../../../cookie/index.ts';
import {
    CONSOLE_SESSION_COOKIE,
    CONSOLE_SESSION_REFRESH_THROTTLE,
    ClientAuthenticator,
    PolicyEngine,
    SYSTEM_CLIENT_SCOPE_NAMES,
    UserAuthenticator,
    assertClientCertificateEvidenceValidForBinding,
} from '../../../../../core/index.ts';
import type {
    ICredentialsAuthenticator,
    IIdentityResolver,
    IOAuth2TokenVerifier,
    ISessionManager,
    ISessionRepository,
} from '../../../../../core/index.ts';
import {
    RequestIdentity,
    RequestPermissionEvaluator,
    extractClientCertificateEvidence,
    isSameOriginRequest,
    setRequestIdentity,
    setRequestMfaLoginTicket,
    setRequestPermissionEvaluator,
    setRequestScopes,
    setRequestSessionId,
    setRequestToken,
} from '../../../request/index.ts';
import { isOAuth2IssuancePath } from './issuance.ts';
import type { HTTPAuthorizationMiddlewareContext, HTTPAuthorizationMiddlewareOptions } from './types.ts';

const runSymbol = Symbol('RAuthorizationMiddlewareRun');

export class AuthorizationMiddleware {
    protected options: HTTPAuthorizationMiddlewareOptions;

    // --------------------------------------

    protected oauth2TokenVerifier: IOAuth2TokenVerifier;

    protected permissionEvaluator: IPermissionEvaluator;

    // --------------------------------------

    protected identityResolver: IIdentityResolver;

    protected sessionManager : ISessionManager;

    protected sessionRepository : ISessionRepository;

    protected logger? : Logger;

    // --------------------------------------

    protected clientAuthenticator : ICredentialsAuthenticator<Client>;

    protected userAuthenticator : ICredentialsAuthenticator<User>;

    // --------------------------------------

    constructor(ctx: HTTPAuthorizationMiddlewareContext) {
        this.options = ctx.options || {};

        this.identityResolver = ctx.identityResolver;
        this.sessionManager = ctx.sessionManager;
        this.sessionRepository = ctx.sessionRepository;
        this.logger = ctx.logger;

        this.clientAuthenticator = new ClientAuthenticator(ctx.identityResolver);
        this.userAuthenticator = new UserAuthenticator(ctx.identityResolver);

        this.oauth2TokenVerifier = ctx.oauth2TokenVerifier;

        this.permissionEvaluator = new PermissionEvaluator({
            provider: ctx.permissionProvider,
            policyEngine: new PolicyEngine(ctx.identityPermissionProvider),
            realmId: null,
            clientId: null,
        });
    }

    // --------------------------------------

    async run(event: IAppEvent): Promise<void> {
        // routup's dispatch walk re-enters earlier middlewares once per
        // remaining match when no handler produces a response — exponentially
        // (routup/routup#946), so an unmatched authenticated request re-ran
        // this middleware ~100+ times, re-verifying Basic credentials (bcrypt)
        // on every re-entry (~4s per 404). Authorization is a pure function of
        // the request: the first run's settlement — including a rejection —
        // is authoritative, so memoize the promise on the request store (the
        // store is shared by every re-entry of the same request).
        const pending = event.store[runSymbol] as Promise<void> | undefined;
        if (pending) {
            return pending;
        }

        const promise = this.runInner(event);
        event.store[runSymbol] = promise;
        return promise;
    }

    protected async runInner(event: IAppEvent): Promise<void> {
        const requestAccessContext = new RequestPermissionEvaluator(
            event,
            this.permissionEvaluator,
        );
        setRequestPermissionEvaluator(event, requestAccessContext);

        const headerValue = event.headers.get('authorization');
        if (!headerValue) {
            // The bearer/Basic path is untouched, and the header keeps
            // winning: the cookie is only consulted when the request presents
            // no credential of its own.
            await this.runCookieSession(event);
            return;
        }

        const header = parseAuthorizationHeader(headerValue);

        if (header.type === AuthorizationHeaderType.BEARER) {
            await this.verifyBearerAuthorizationHeader(event, header);
            return;
        }

        if (header.type === AuthorizationHeaderType.BASIC) {
            await this.verifyBasicAuthorizationHeader(event, header);
            return;
        }

        throw AuthHeaderError.unsupportedType(header.type);
    }

    /**
     * The console session cookie (plan 088): an opaque credential naming an
     * `auth_sessions` row, presented instead of a bearer token by a console
     * served from the API's own origin.
     *
     * It NEVER throws and never rejects a request. Anything missing, stale or
     * refused simply leaves the request anonymous, which the route's own
     * `ForceLoggedIn` guard then answers — the same outcome as sending no
     * credential at all. A cookie is ambient, so a request that merely carries
     * a bad one is not necessarily a request that meant to use it.
     */
    protected async runCookieSession(event: IAppEvent): Promise<void> {
        try {
            const { baseURL } = this.options;
            if (!baseURL) {
                // The origin gate cannot be evaluated without publicUrl, so
                // the cookie is not honoured at all.
                return;
            }

            const secret = useRequestCookie(event, CONSOLE_SESSION_COOKIE);
            if (typeof secret !== 'string' || secret.length === 0) {
                return;
            }

            // Finding 2 of plan 088, and an invariant rather than a detail:
            // an ambient cookie must never reach the OAuth2 issuance surface,
            // or one script execution on this origin turns it back into a
            // portable token pair.
            if (isOAuth2IssuancePath(event.path)) {
                return;
            }

            if (!isSameOriginRequest(event, baseURL, { logger: this.logger })) {
                return;
            }

            const session = await this.sessionRepository.findOneBySecret(secret);
            if (!session) {
                return;
            }

            // The consoles are user surfaces. A client-subject session would
            // otherwise authenticate here and then produce a sign-in loop in a
            // console that can only render a user.
            if (session.subKind !== IdentityType.USER) {
                return;
            }

            try {
                // Same expiry contract as the bearer path (it also drops the
                // expired row), minus the rejection.
                await this.sessionManager.verify(session);
            } catch {
                return;
            }

            const identity = await this.identityResolver.resolve(
                IdentityType.USER,
                session.sub,
            );
            if (!identity) {
                return;
            }

            setRequestIdentity(event, identity);
            // Named explicitly: createRequestEventContextMiddleware reads it
            // for audit attribution, so omitting it would regress plan 093's
            // session attribution to null on every cookie-mode write.
            setRequestSessionId(event, session.id);
            // The console's granted scope set is a constant — the cookie
            // belongs to a console session, and the console client is
            // provisioned with exactly these (SYSTEM_CLIENT_SCOPE_NAMES).
            setRequestScopes(event, [...SYSTEM_CLIENT_SCOPE_NAMES]);

            await this.refreshCookieSession(event, session, secret);
        } catch {
            // Defense in depth around everything above: an anonymous request
            // is always a valid outcome here, an error page never is.
        }
    }

    /**
     * Slide the session's expiry, throttled.
     *
     * Cookie mode has no refresh grant, so without this an active console user
     * would be signed out once the session reached its lifetime, mid-task
     * (plan 088: a credential change must not become a session-policy change
     * by omission).
     */
    protected async refreshCookieSession(
        event: IAppEvent,
        session: Session,
        secret: string,
    ): Promise<void> {
        const refreshedAt = session.refreshedAt || session.createdAt;
        if (refreshedAt) {
            const threshold = new Date(refreshedAt).getTime() + CONSOLE_SESSION_REFRESH_THROTTLE;
            if (threshold > Date.now()) {
                return;
            }
        }

        // `repository.save` upserts by primary key, so writing the row read at
        // the top of this request would RESURRECT a session a concurrent
        // sign-out deleted in between. Re-read first: the sign-out drops both
        // the row and its cache entry, so a miss here means the session is
        // gone and there is nothing to slide.
        const current = await this.sessionManager.findOneById(session.id);
        if (!current) {
            return;
        }

        const refreshed = await this.sessionManager.refresh(current);

        // Re-arm the cookie, or the slide is invisible to the browser. A
        // cookie's `Max-Age` is fixed by the response that set it, so leaving
        // it at the value the callback computed would have the browser discard
        // the credential at login + one lifetime no matter how recently the
        // session was used — the hard cap the sliding decision rejected, with
        // the server-side slide happening and never being observable.
        const ttl = new Date(refreshed.expiresAt).getTime() - Date.now();
        if (ttl > 0 && this.options.baseURL) {
            setConsoleSessionCookie(event, this.options.baseURL, secret, ttl);
        }
    }

    /**
     * @throws JWTError
     */
    protected async verifyBearerAuthorizationHeader(
        event: IAppEvent,
        header: BearerAuthorizationHeader,
    ) {
        const payload = await this.oauth2TokenVerifier.verify(header.token);
        await this.verifyCertificateBinding(event, payload);
        if (payload.kind === OAuth2TokenKind.MFA) {
            await this.verifyMfaLoginTicket(event, payload);
            return;
        }

        if (payload.kind !== OAuth2TokenKind.ACCESS) {
            throw JWTError.payloadPropertyInvalid('kind');
        }

        if (!payload.realm_id) {
            throw JWTError.payloadPropertyInvalid('realm_id');
        }

        setRequestToken(event, header.token);

        if (payload.scope) {
            setRequestScopes(event, deserializeOAuth2Scope(payload.scope));
        }

        // -------------------------------------------------------

        if (!payload.session_id) {
            throw JWTError.payloadPropertyInvalid('session_id');
        }

        const session = await this.sessionManager.findOneById(payload.session_id);
        if (!session) {
            throw JWTError.expired();
        }

        try {
            await this.sessionManager.verify(session);
        } catch {
            throw JWTError.expired();
        }

        await this.sessionManager.ping(session);

        setRequestSessionId(event, payload.session_id);

        // -------------------------------------------------------

        if (!payload.sub_kind) {
            throw JWTError.payloadPropertyInvalid('sub_kind');
        }

        if (!payload.sub) {
            throw JWTError.payloadPropertyInvalid('sub');
        }

        const identity = await this.identityResolver.resolve(
            payload.sub_kind,
            payload.sub,
        );

        if (identity) {
            setRequestIdentity(event, identity);
        }
    }

    protected async verifyCertificateBinding(event: IAppEvent, payload: OAuth2TokenPayload): Promise<void> {
        if (!payload.cnf) {
            return;
        }

        const expectedThumbprint = payload.cnf['x5t#S256'];
        if (typeof expectedThumbprint !== 'string' || expectedThumbprint.length === 0) {
            throw JWTError.invalid();
        }

        try {
            const evidence = await extractClientCertificateEvidence(
                event,
                this.options.certificateSource ?? 'disabled',
            );
            if (!evidence || evidence.thumbprint !== expectedThumbprint) {
                throw JWTError.invalid();
            }

            assertClientCertificateEvidenceValidForBinding(evidence);
        } catch {
            throw JWTError.invalid();
        }
    }

    /**
     * An "MFA-pending" login ticket (issue #3242). Verified with the same
     * rigor as an access token (session existence + subject match), but
     * stashed on a DEDICATED request slot — the main identity / scope /
     * session slots stay empty, so every identity-gated route rejects a
     * ticket bearer (default-deny); only the challenge routes opt in via
     * useRequestMfaLoginTicket.
     *
     * @throws JWTError
     */
    protected async verifyMfaLoginTicket(
        event: IAppEvent,
        payload: OAuth2TokenPayload,
    ) {
        if (payload.sub_kind !== OAuth2SubKind.USER) {
            throw JWTError.payloadPropertyInvalid('sub_kind');
        }

        if (!payload.sub) {
            throw JWTError.payloadPropertyInvalid('sub');
        }

        if (!payload.realm_id) {
            throw JWTError.payloadPropertyInvalid('realm_id');
        }

        if (!payload.session_id) {
            throw JWTError.payloadPropertyInvalid('session_id');
        }

        const session = await this.sessionManager.findOneById(payload.session_id);
        if (!session) {
            throw JWTError.expired();
        }

        try {
            await this.sessionManager.verify(session);
        } catch {
            throw JWTError.expired();
        }

        // defense in depth — the pending session must still belong to the
        // ticket subject.
        if (
            session.sub !== payload.sub ||
            session.subKind !== IdentityType.USER
        ) {
            throw JWTError.expired();
        }

        await this.sessionManager.ping(session);

        const identity = await this.identityResolver.resolve(
            payload.sub_kind,
            payload.sub,
        );
        if (!identity) {
            throw JWTError.expired();
        }

        setRequestMfaLoginTicket(event, {
            identity: new RequestIdentity(identity),
            payload,
        });
    }

    protected async verifyBasicAuthorizationHeader(
        event: IAppEvent,
        header: BasicAuthorizationHeader,
    ) {
        if (this.options.clientAuthBasic) {
            const authenticator = await this.clientAuthenticator.safeAuthenticate(
                header.username,
                header.password,
            );
            if (authenticator.success) {
                setRequestScopes(event, [ScopeName.GLOBAL]);
                setRequestIdentity(event, {
                    type: IdentityType.CLIENT,
                    data: authenticator.data,
                });
            }
        }

        if (this.options.userAuthBasic) {
            const authenticated = await this.userAuthenticator.safeAuthenticate(
                header.username,
                header.password,
            );

            if (authenticated.success) {
                setRequestScopes(event, [ScopeName.GLOBAL]);
                setRequestIdentity(event, {
                    type: IdentityType.USER,
                    data: authenticated.data,
                });
            }
        }
    }
}
