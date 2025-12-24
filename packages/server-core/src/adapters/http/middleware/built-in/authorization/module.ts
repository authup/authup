/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionChecker } from '@authup/access';
import { CookieName } from '@authup/core-http-kit';
import type { Client, Robot, User } from '@authup/core-kit';
import {
    IdentityType,
    ScopeName,
} from '@authup/core-kit';
import { HTTPError } from '@authup/errors';
import { JWTError, OAuth2TokenKind, deserializeOAuth2Scope } from '@authup/specs';
import type { SerializeOptions } from '@routup/basic/cookie';
import { unsetResponseCookie, useRequestCookie } from '@routup/basic/cookie';
import { getRequestHostName } from 'routup';
import type { Next, Request, Response } from 'routup';
import {
    AuthorizationHeaderType,
    type BasicAuthorizationHeader,
    type BearerAuthorizationHeader,
    parseAuthorizationHeader,
    stringifyAuthorizationHeader,
} from 'hapic';
import { PolicyEngine } from '../../../../../security';
import type {
    ICredentialsAuthenticator, IIdentityResolver,
    IOAuth2TokenVerifier, ISessionManager,
} from '../../../../../core';
import {
    ClientAuthenticator,
    RobotAuthenticator,

    UserAuthenticator,
} from '../../../../../core';
import {
    RequestPermissionChecker,
    setRequestIdentity,
    setRequestPermissionChecker,
    setRequestScopes,
    setRequestToken,
} from '../../../request';
import type { HTTPAuthorizationMiddlewareContext, HTTPAuthorizationMiddlewareOptions } from './types';

export class AuthorizationMiddleware {
    protected options: HTTPAuthorizationMiddlewareOptions;

    // --------------------------------------

    protected oauth2TokenVerifier: IOAuth2TokenVerifier;

    protected permissionChecker: PermissionChecker;

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

        this.clientAuthenticator = new ClientAuthenticator(ctx.identityResolver);
        this.robotAuthenticator = new RobotAuthenticator(ctx.identityResolver);
        this.userAuthenticator = new UserAuthenticator(ctx.identityResolver);

        this.oauth2TokenVerifier = ctx.oauth2TokenVerifier;

        this.permissionChecker = new PermissionChecker({
            provider: ctx.permissionProvider,
            policyEngine: new PolicyEngine(),
        });
    }

    // --------------------------------------

    async run(request: Request, response: Response, next: Next) {
        const requestPermissionChecker = new RequestPermissionChecker(request, this.permissionChecker);
        setRequestPermissionChecker(request, requestPermissionChecker);

        let { authorization: headerValue } = request.headers;

        try {
            if (typeof headerValue === 'undefined') {
                const cookie = useRequestCookie(request, CookieName.ACCESS_TOKEN);
                if (cookie) {
                    headerValue = stringifyAuthorizationHeader({
                        type: 'Bearer',
                        token: cookie,
                    });
                }
            }

            if (typeof headerValue !== 'string') {
                next();
                return;
            }

            const header = parseAuthorizationHeader(headerValue);

            if (header.type === AuthorizationHeaderType.BEARER) {
                await this.verifyBearerAuthorizationHeader(request, header);
                next();
                return;
            } if (header.type === AuthorizationHeaderType.BASIC) {
                await this.verifyBasicAuthorizationHeader(request, header);
                next();
                return;
            }

            next(HTTPError.unsupportedHeaderType(header.type));
        } catch (e) {
            const cookieOptions : SerializeOptions = {};

            if (this.options.cookieDomain) {
                cookieOptions.domain = this.options.cookieDomain;
            } else {
                cookieOptions.domain = getRequestHostName(response.req, {
                    trustProxy: true,
                });
            }

            unsetResponseCookie(response, CookieName.ACCESS_TOKEN, cookieOptions);
            unsetResponseCookie(response, CookieName.REFRESH_TOKEN, cookieOptions);
            unsetResponseCookie(response, CookieName.ACCESS_TOKEN_EXPIRE_DATE, cookieOptions);

            next(e as Error);
        }
    }

    /**
     *
     * @throws JWTError
     *
     * @param request
     * @param header
     *
     * @protected
     */
    protected async verifyBearerAuthorizationHeader(
        request: Request,
        header: BearerAuthorizationHeader,
    ) {
        const payload = await this.oauth2TokenVerifier.verify(header.token);
        if (payload.kind !== OAuth2TokenKind.ACCESS) {
            throw JWTError.payloadPropertyInvalid('kind');
        }

        if (!payload.realm_id) {
            throw JWTError.payloadPropertyInvalid('realm_id');
        }

        setRequestToken(request, header.token);

        if (payload.scope) {
            setRequestScopes(request, deserializeOAuth2Scope(payload.scope));
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
        } catch (e) {
            throw JWTError.expired();
        }

        await this.sessionManager.ping(session);

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
            setRequestIdentity(request, identity);
        }
    }

    protected async verifyBasicAuthorizationHeader(
        request: Request,
        header: BasicAuthorizationHeader,
    ) {
        if (this.options.clientAuthBasic) {
            const authenticator = await this.clientAuthenticator.safeAuthenticate(
                header.username,
                header.password,
            );
            if (authenticator.success) {
                setRequestScopes(request, [ScopeName.GLOBAL]);
                setRequestIdentity(request, {
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
                setRequestScopes(request, [ScopeName.GLOBAL]);
                setRequestIdentity(request, {
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
                setRequestScopes(request, [ScopeName.GLOBAL]);
                setRequestIdentity(request, {
                    type: IdentityType.ROBOT,
                    data: authenticated.data,
                });
            }
        }
    }
}
