/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionChecker } from '@authup/access';
import { CookieName } from '@authup/core-http-kit';
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
import { useConfig } from '../../../../../config';
import { PermissionDBProvider, PolicyEngine } from '../../../../../security';
import {
    ClientAuthenticator,
    RobotAuthenticationService,
    UserAuthenticator,
} from '../../../../../core';
import type {
    IIdentityResolver,
    IOAuth2TokenVerifier,
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

    protected identityResolver : IIdentityResolver;

    // --------------------------------------

    constructor(ctx: HTTPAuthorizationMiddlewareContext) {
        this.options = ctx.options || {};

        this.identityResolver = ctx.identityResolver;
        this.oauth2TokenVerifier = ctx.oauth2TokenVerifier;

        const provider = new PermissionDBProvider(ctx.dataSource);
        this.permissionChecker = new PermissionChecker({
            provider,
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
            const config = useConfig();
            const cookieOptions : SerializeOptions = {};

            if (config.cookieDomain) {
                cookieOptions.domain = config.cookieDomain;
            } else {
                cookieOptions.domain = getRequestHostName(response.req, {
                    trustProxy: true,
                });
            }

            unsetResponseCookie(response, CookieName.ACCESS_TOKEN, cookieOptions);
            unsetResponseCookie(response, CookieName.REFRESH_TOKEN, cookieOptions);
            unsetResponseCookie(response, CookieName.ACCESS_TOKEN_EXPIRE_DATE, cookieOptions);

            next(e);
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
        if (this.options.userAuthBasic) {
            const identity = await this.identityResolver.resolve(
                IdentityType.USER,
                header.username,
            );

            if (
                identity &&
                identity.type === IdentityType.USER
            ) {
                const authenticationService = new UserAuthenticator();
                const authenticated = await authenticationService.safeAuthenticate(
                    identity.data,
                    header.password,
                );

                if (authenticated.success) {
                    setRequestScopes(request, [ScopeName.GLOBAL]);
                    setRequestIdentity(request, identity);

                    return;
                }
            }
        }

        if (this.options.robotAuthBasic) {
            const identity = await this.identityResolver.resolve(
                IdentityType.ROBOT,
                header.username,
            );

            if (
                identity &&
                identity.type === IdentityType.ROBOT
            ) {
                const authenticationService = new RobotAuthenticationService();
                const authenticated = await authenticationService.safeAuthenticate(
                    identity.data,
                    header.password,
                );
                if (authenticated.success) {
                    setRequestScopes(request, [ScopeName.GLOBAL]);
                    setRequestIdentity(request, identity);
                }
            }
        }

        if (this.options.clientAuthBasic) {
            const identity = await this.identityResolver.resolve(
                IdentityType.CLIENT,
                header.username,
            );

            if (
                identity &&
                identity.type === IdentityType.CLIENT
            ) {
                const authenticationService = new ClientAuthenticator();
                const authenticated = await authenticationService.safeAuthenticate(identity.data, header.password);
                if (authenticated.success) {
                    setRequestScopes(request, [ScopeName.GLOBAL]);
                    setRequestIdentity(request, identity);
                }
            }
        }
    }
}
