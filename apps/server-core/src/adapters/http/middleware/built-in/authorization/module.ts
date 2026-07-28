/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IPermissionEvaluator } from '@authup/access';
import { PermissionEvaluator } from '@authup/access';
import type { Client, User } from '@authup/core-kit';
import {
    IdentityType,
    ScopeName,
} from '@authup/core-kit';
import { AuthHeaderError } from '@authup/errors';
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
import {
    ClientAuthenticator,
    PolicyEngine,
    UserAuthenticator,
    assertClientCertificateEvidenceValidForBinding,
} from '../../../../../core/index.ts';
import type {
    ICredentialsAuthenticator,
    IIdentityResolver,
    IOAuth2TokenVerifier,
    ISessionManager,
} from '../../../../../core/index.ts';
import {
    RequestIdentity,
    RequestPermissionEvaluator,
    extractClientCertificateEvidence,
    setRequestIdentity,
    setRequestMfaLoginTicket,
    setRequestPermissionEvaluator,
    setRequestScopes,
    setRequestSessionId,
    setRequestToken,
} from '../../../request/index.ts';
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

    // --------------------------------------

    protected clientAuthenticator : ICredentialsAuthenticator<Client>;

    protected userAuthenticator : ICredentialsAuthenticator<User>;

    // --------------------------------------

    constructor(ctx: HTTPAuthorizationMiddlewareContext) {
        this.options = ctx.options || {};

        this.identityResolver = ctx.identityResolver;
        this.sessionManager = ctx.sessionManager;

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
