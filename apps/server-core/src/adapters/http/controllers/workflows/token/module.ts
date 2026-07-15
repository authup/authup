/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse, OAuth2TokenIntrospectionResponse, OAuth2TokenPermission } from '@authup/specs';
import { OAuth2GrantTypeError, OAuth2RequestError, OAuth2TokenGrant } from '@authup/specs';
import {
    DContext,
    DController,
    DGet,
    DPost,
    DTags,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import { buildPermissionKey } from '@authup/access';
import { toOAuth2Error } from '../../../../../core/oauth2/helpers/index.ts';
import type { TokenControllerContext } from './types.ts';
import type {
    IAuthFlowMetrics,
    IIdentityPermissionProvider,
    IIdentityResolver,
    IOAuth2TokenIssuer,
    IOAuth2TokenRevoker,
    IOAuth2TokenVerifier,
} from '../../../../../core/index.ts';
import { OAuth2OpenIDClaimsBuilder } from '../../../../../core/index.ts';
import type { IHTTPOAuth2Grant } from '../../../adapters/index.ts';
import {
    HTTPClientCredentialsGrant,
    HTTPOAuth2AuthorizeGrant,
    HTTPOAuth2RefreshTokenGrant,
    HTTPPasswordGrant,
    HTTPRobotCredentialsGrant,
    guessOauth2GrantTypeByRequest,
} from '../../../adapters/index.ts';
import { extractTokenFromRequest } from './utils/index.ts';

@DTags('auth')
@DController('/token')
export class TokenController {
    protected refreshTokenIssuer: IOAuth2TokenIssuer;

    protected accessTokenIssuer: IOAuth2TokenIssuer;

    protected tokenVerifier: IOAuth2TokenVerifier;

    protected tokenRevoker: IOAuth2TokenRevoker;

    protected identityResolver : IIdentityResolver;

    protected identityPermissionProvider : IIdentityPermissionProvider;

    protected metrics? : IAuthFlowMetrics;

    protected tokenGrants : Record<`${OAuth2TokenGrant}`, IHTTPOAuth2Grant>;

    // -------------------------------------------

    constructor(ctx: TokenControllerContext) {
        this.refreshTokenIssuer = ctx.refreshTokenIssuer;
        this.accessTokenIssuer = ctx.accessTokenIssuer;
        this.tokenVerifier = ctx.tokenVerifier;
        this.tokenRevoker = ctx.tokenRevoker;
        this.identityResolver = ctx.identityResolver;
        this.identityPermissionProvider = ctx.identityPermissionProvider;
        this.metrics = ctx.metrics;

        this.tokenGrants = {
            [OAuth2TokenGrant.AUTHORIZATION_CODE]: new HTTPOAuth2AuthorizeGrant({
                codeVerifier: ctx.codeVerifier,
                clientAuthenticator: ctx.oauth2ClientAuthenticator,
                accessTokenIssuer: ctx.accessTokenIssuer,
                refreshTokenIssuer: ctx.refreshTokenIssuer,
                openIdTokenIssuer: ctx.openIdTokenIssuer,
                keyStore: ctx.keyStore,
                sessionManager: ctx.sessionManager,
                realmRepository: ctx.realmRepository,
                accessPolicyEvaluator: ctx.accessPolicyEvaluator,
                certificateSource: ctx.certificateSource,
            }),
            [OAuth2TokenGrant.CLIENT_CREDENTIALS]: new HTTPClientCredentialsGrant({
                accessTokenIssuer: ctx.accessTokenIssuer,
                clientAuthenticator: ctx.oauth2ClientAuthenticator,
                sessionManager: ctx.sessionManager,
                certificateSource: ctx.certificateSource,
            }),
            [OAuth2TokenGrant.ROBOT_CREDENTIALS]: new HTTPRobotCredentialsGrant({
                accessTokenIssuer: ctx.accessTokenIssuer,
                authenticator: ctx.robotAuthenticator,
                sessionManager: ctx.sessionManager,
            }),
            [OAuth2TokenGrant.PASSWORD]: new HTTPPasswordGrant({
                accessTokenIssuer: ctx.accessTokenIssuer,
                refreshTokenIssuer: ctx.refreshTokenIssuer,
                authenticator: ctx.userAuthenticator,
                clientAuthenticator: ctx.oauth2ClientAuthenticator,
                sessionManager: ctx.sessionManager,
                realmRepository: ctx.realmRepository,
                eventService: ctx.eventService,
                metrics: ctx.metrics,
                loginThrottleService: ctx.loginThrottleService,
                userAuthenticatorService: ctx.userAuthenticatorService,
                mfaLoginService: ctx.mfaLoginService,
                logger: ctx.logger,
                certificateSource: ctx.certificateSource,
            }),
            [OAuth2TokenGrant.REFRESH_TOKEN]: new HTTPOAuth2RefreshTokenGrant({
                accessTokenIssuer: ctx.accessTokenIssuer,
                refreshTokenIssuer: ctx.refreshTokenIssuer,
                tokenVerifier: ctx.tokenVerifier,
                tokenRepository: ctx.tokenRepository,
                sessionTokenRepository: ctx.sessionTokenRepository,
                sessionManager: ctx.sessionManager,
                clientAuthenticator: ctx.oauth2ClientAuthenticator,
                realmRepository: ctx.realmRepository,
                eventService: ctx.eventService,
                metrics: ctx.metrics,
                logger: ctx.logger,
                options: { gracePeriod: ctx.tokenRefreshGracePeriod },
                certificateSource: ctx.certificateSource,
            }),
        };
    }

    // -------------------------------------------

    @DGet('/introspect', [])
    async getIntrospect(@DContext() event: IAppEvent): Promise<OAuth2TokenIntrospectionResponse> {
        return this.postIntrospect(event);
    }

    @DPost('/introspect', [])
    async postIntrospect(
        @DContext() event: IAppEvent,
    ): Promise<OAuth2TokenIntrospectionResponse> {
        try {
            const token = await extractTokenFromRequest(event);
            const payload = await this.tokenVerifier.verify(token, { skipActiveCheck: true });
            if (!payload.sub || !payload.sub_kind) {
                throw OAuth2RequestError.identityInvalid();
            }

            // todo: only receive client specific permissions
            const permissions = await this.identityPermissionProvider.getFor({
                id: payload.sub,
                type: payload.sub_kind,
                clientId: payload.client_id,
                realmId: payload.realm_id,
            });

            const identity = await this.identityResolver.resolve(payload.sub_kind, payload.sub);
            if (!identity) {
                // todo: differentiate between client, robot & user
                throw OAuth2RequestError.identityInvalid();
            }

            const claimsBuilder = new OAuth2OpenIDClaimsBuilder();
            const claims = claimsBuilder.fromIdentity(identity);

            let active : boolean;
            if (payload.jti) {
                const isInactive = await this.tokenVerifier.isInactive(payload.jti);
                active = !isInactive;
            } else {
                active = false;
            }

            return {
                active,
                // todo: permissions property should be removed.
                permissions: Object.values(
                    permissions.reduce((acc, binding) => {
                        const key = buildPermissionKey(binding.permission);
                        if (!acc[key]) {
                            acc[key] = {
                                name: binding.permission.name,
                                client_id: binding.permission.client_id,
                                realm_id: binding.permission.realm_id,
                            } as OAuth2TokenPermission;
                        }
                        return acc;
                    }, {} as Record<string, OAuth2TokenPermission>),
                ),
                ...payload,
                ...claims,
            };
        } catch (e) {
            throw toOAuth2Error(e);
        }
    }

    // ----------------------------------------------------------

    @DPost('/revoke', [])
    async revokeToken(
        @DContext() event: IAppEvent,
    ): Promise<null> {
        try {
            const token = await extractTokenFromRequest(event);

            // RFC 7009 §2.2: revoking an invalid token — here one that is expired
            // or already inactive — MUST still succeed. The client cannot act on
            // an error, and the token's invalidation (the point of the request)
            // is already achieved. Signature + kind still anchor the token, so a
            // forged/garbage token is rejected; `ignoreExpiry` additionally keeps
            // this exp-bypass out of the shared claims cache (see
            // OAuth2TokenVerifier). Without this, revoking a stale refresh token
            // threw `expired_token`, so the caller's revoke-then-clear-cookie
            // flow aborted, the durable row was never soft-revoked, and the stale
            // refresh cookie survived into the next login.
            const payload = await this.tokenVerifier.verify(token, {
                ignoreExpiry: true,
                skipActiveCheck: true,
            });

            await this.tokenRevoker.revoke(payload);

            event.response.status = 202;
            return null;
        } catch (e) {
            throw toOAuth2Error(e);
        }
    }

    // ----------------------------------------------------------

    @DPost('', [])
    async createToken(@DContext() event: IAppEvent): Promise<OAuth2TokenGrantResponse> {
        const grantType = await guessOauth2GrantTypeByRequest(event);
        if (!grantType) {
            throw OAuth2GrantTypeError.unsupported();
        }

        const grant = this.tokenGrants[grantType];
        if (!grant) {
            throw OAuth2GrantTypeError.unsupported();
        }

        const response = await grant.runWithRequest(event);

        this.metrics?.recordTokenGrant(grantType);

        return response;
    }
}
