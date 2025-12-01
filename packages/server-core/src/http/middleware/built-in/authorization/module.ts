/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionProvider } from '@authup/access';
import { PermissionChecker } from '@authup/access';
import { CookieName } from '@authup/core-http-kit';
import {
    ScopeName,
} from '@authup/core-kit';
import { HTTPError } from '@authup/errors';
import { buildRedisKeyPath } from '@authup/server-kit';
import { JWTError, OAuth2TokenKind, deserializeOAuth2Scope } from '@authup/specs';
import type { SerializeOptions } from '@routup/basic/cookie';
import { unsetResponseCookie, useRequestCookie } from '@routup/basic/cookie';
import { getRequestHostName } from 'routup';
import type { Next, Request, Response } from 'routup';
import type { DataSource } from 'typeorm';
import {
    AuthorizationHeaderType,
    type BasicAuthorizationHeader,
    type BearerAuthorizationHeader,
    parseAuthorizationHeader,
    stringifyAuthorizationHeader,
} from 'hapic';
import type { Config } from '../../../../config';
import { useConfig } from '../../../../config';
import {
    CachePrefix,
    ClientRepository,
    RealmRepository, RobotRepository, UserRepository,
} from '../../../../database/domains';
import { PermissionDBProvider, PolicyEngine } from '../../../../security';
import { ClientAuthenticationService, RobotAuthenticationService, UserAuthenticationService } from '../../../../services';
import { OAuth2IdentityResolver, OAuth2TokenVerifier } from '../../../../core/oauth2';
import { OAuth2KeyRepository } from '../../../../core/oauth2/key';
import { OAuth2TokenRepository } from '../../../../database/adapters/oauth2/token/repository';
import {
    RequestPermissionChecker,
    setRequestIdentity,
    setRequestPermissionChecker,
    setRequestScopes,
    setRequestToken,
} from '../../../request';

export class AuthorizationMiddleware {
    protected config : Config;

    // --------------------------------------

    protected oauth2TokenVerifier: OAuth2TokenVerifier;

    protected oauth2IdentityResolver :OAuth2IdentityResolver;

    protected permissionProvider : PermissionProvider;

    protected permissionChecker: PermissionChecker;

    // --------------------------------------

    protected realmRepository : RealmRepository;

    protected userRepository : UserRepository;

    protected robotRepository : RobotRepository;

    protected clientRepository : ClientRepository;

    // --------------------------------------

    constructor(dataSource: DataSource) {
        this.config = useConfig();

        const keyRepository = new OAuth2KeyRepository();
        const tokenRepository = new OAuth2TokenRepository();

        this.oauth2TokenVerifier = new OAuth2TokenVerifier(
            keyRepository,
            tokenRepository,
        );
        this.oauth2IdentityResolver = new OAuth2IdentityResolver();

        this.permissionProvider = new PermissionDBProvider(dataSource);
        this.permissionChecker = new PermissionChecker({
            provider: this.permissionProvider,
            policyEngine: new PolicyEngine(),
        });

        this.realmRepository = new RealmRepository(dataSource);

        this.userRepository = new UserRepository(dataSource);
        this.robotRepository = new RobotRepository(dataSource);
        this.clientRepository = new ClientRepository(dataSource);
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

        const identity = await this.oauth2IdentityResolver.resolve(payload);

        let realmName: string;

        if (payload.realm_name) {
            realmName = payload.realm_name;
        } else {
            const realm = await this.realmRepository.findOne({
                where: {
                    id: payload.realm_id,
                },
                cache: {
                    id: buildRedisKeyPath({
                        prefix: CachePrefix.REALM,
                        key: payload.realm_id,
                    }),
                    milliseconds: 60_000,
                },
            });

            if (!realm) {
                throw JWTError.payloadPropertyInvalid('realm_id');
            }

            realmName = realm.name;
        }

        setRequestIdentity(request, {
            type: identity.type,
            id: identity.data.id,
            attributes: identity.data,
            clientId: payload.client_id,
            realmId: payload.realm_id,
            realmName,
        });
    }

    protected async verifyBasicAuthorizationHeader(
        request: Request,
        header: BasicAuthorizationHeader,
    ) {
        if (this.config.userAuthBasic) {
            const authenticationService = new UserAuthenticationService();
            const user = await authenticationService.resolve(header.username);

            if (user) {
                const authenticated = await authenticationService.safeAuthenticate(user, header.password);
                if (authenticated.success) {
                    await this.userRepository.extendOneWithEA(user);

                    setRequestScopes(request, [ScopeName.GLOBAL]);
                    setRequestIdentity(request, {
                        type: 'user',
                        id: user.id,
                        attributes: user,
                        realmId: user.realm.id,
                        realmName: user.realm.name,
                    });

                    return;
                }
            }
        }

        if (this.config.robotAuthBasic) {
            const authenticationService = new RobotAuthenticationService();
            const robot = await authenticationService.resolve(header.username);

            if (robot) {
                const authenticated = await authenticationService.safeAuthenticate(robot, header.password);
                if (authenticated.success) {
                    setRequestScopes(request, [ScopeName.GLOBAL]);
                    setRequestIdentity(request, {
                        type: 'robot',
                        id: robot.id,
                        attributes: robot,
                        realmId: robot.realm.id,
                        realmName: robot.realm.name,
                    });
                }
            }
        }

        if (this.config.clientAuthBasic) {
            const authenticationService = new ClientAuthenticationService();
            const client = await authenticationService.resolve(header.username);

            if (client) {
                const authenticated = await authenticationService.safeAuthenticate(client, header.password);
                if (authenticated.success) {
                    setRequestScopes(request, [ScopeName.GLOBAL]);
                    setRequestIdentity(request, {
                        type: 'client',
                        id: client.id,
                        attributes: client,
                        realmId: client.realm.id,
                        realmName: client.realm.name,
                    });
                }
            }
        }
    }
}
