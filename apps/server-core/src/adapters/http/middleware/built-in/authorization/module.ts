/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IPermissionEvaluator } from '@authup/access';
import { PermissionEvaluator } from '@authup/access';
import type { Client, Robot, User } from '@authup/core-kit';
import {
    IdentityType,
    ScopeName,
} from '@authup/core-kit';
import { AuthHeaderError } from '@authup/errors';
import { JWTError, OAuth2TokenKind, deserializeOAuth2Scope } from '@authup/specs';
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
    RobotAuthenticator,
    UserAuthenticator, 
} from '../../../../../core/index.ts';
import type {
    ICredentialsAuthenticator, 
    IIdentityResolver,
    IOAuth2TokenVerifier, 
    ISessionManager,
} from '../../../../../core/index.ts';
import {
    RequestPermissionEvaluator,
    setRequestIdentity,
    setRequestPermissionEvaluator,
    setRequestScopes,
    setRequestSessionId,
    setRequestToken,
} from '../../../request/index.ts';
import type { HTTPAuthorizationMiddlewareContext, HTTPAuthorizationMiddlewareOptions } from './types.ts';

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

    protected robotAuthenticator : ICredentialsAuthenticator<Robot>;

    protected userAuthenticator : ICredentialsAuthenticator<User>;

    // --------------------------------------

    constructor(ctx: HTTPAuthorizationMiddlewareContext) {
        this.options = ctx.options || {};

        this.identityResolver = ctx.identityResolver;
        this.sessionManager = ctx.sessionManager;

        this.clientAuthenticator = new ClientAuthenticator(ctx.identityResolver);
        this.robotAuthenticator = new RobotAuthenticator(ctx.identityResolver);
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

    async run(event: IAppEvent) {
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

                return;
            }
        }

        if (this.options.robotAuthBasic) {
            const authenticated = await this.robotAuthenticator.safeAuthenticate(
                header.username,
                header.password,
            );
            if (authenticated.success) {
                setRequestScopes(event, [ScopeName.GLOBAL]);
                setRequestIdentity(event, {
                    type: IdentityType.ROBOT,
                    data: authenticated.data,
                });
            }
        }
    }
}
