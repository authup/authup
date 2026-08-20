/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse, OAuth2TokenIntrospectionResponse, OAuth2TokenPermission } from '@authup/specs';
import { 
    OAuth2GrantTypeError, 
    OAuth2RequestError, 
    OAuth2TokenGrant, 
    isJWTError, 
} from '@authup/specs';
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

            // `ignoreExpiry`, so an expired token still reports WHOSE it was:
            // a third-party app can say "your session ended, <name>" instead
            // of only "no". Everything the caller could act on - the subject,
            // its claims - is in a token we did issue and can still read.
            //
            // `active` is derived below and NEVER from this call. The
            // signature-keyed cache returns a hit without re-checking `exp`
            // (verifier/module.ts), so relying on the verify to reject an
            // expired token would report one as active for as long as its
            // entry survives. The verifier deliberately skips WRITING the
            // cache on this path, so no expired payload can enter it here.
            const payload = await this.tokenVerifier.verify(token, {
                ignoreExpiry: true,
                skipActiveCheck: true,
            });
            if (!payload.sub || !payload.sub_kind) {
                // Not a report about a token this server ever issued: authup
                // mints every one with a subject, so a verifying token without
                // one was never valid. `active: false` would claim we knew it
                // and let it lapse.
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
                // todo: differentiate between client & user
                throw OAuth2RequestError.identityInvalid();
            }

            const claimsBuilder = new OAuth2OpenIDClaimsBuilder();
            const claims = claimsBuilder.fromIdentity(identity);

            // Both halves, fail-closed on a missing claim: a token carrying no
            // `jti` cannot be checked against the revocation list, and one
            // carrying no `exp` cannot be shown to be current. Authup mints
            // every token with both.
            let active : boolean;
            if (payload.jti && typeof payload.exp === 'number') {
                const isInactive = await this.tokenVerifier.isInactive(payload.jti);
                active = !isInactive && payload.exp * 1000 > Date.now();
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
                                client_id: binding.permission.clientId,
                                realm_id: binding.permission.realmId,
                            } as OAuth2TokenPermission;
                        }
                        return acc;
                    }, {} as Record<string, OAuth2TokenPermission>),
                ),
                ...payload,
                ...claims,
            };
        } catch (e) {
            // RFC 7662 §2.2: a token that "is not active, does not exist on
            // this server, or the protected resource is not allowed to
            // introspect" MUST be answered with `active: false`. A token this
            // server cannot read does not exist on it, so it is reported like
            // any other rather than raised - which is what §2.2 asks for and
            // what keeps this endpoint from telling a caller whether a string
            // was signed by a key we hold.
            //
            // The report is BARE, no payload: §2.2 and §4 both say not to
            // disclose more about an inactive token, and there is nothing to
            // disclose here anyway. The expired case is the deliberate
            // exception, and it never reaches this catch - it is verified
            // above and reported with its claims.
            if (isJWTError(e)) {
                return { active: false };
            }

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
            // Same clause, the other half: "invalid tokens do not cause an
            // error response since the client cannot handle such an error in a
            // reasonable way". Expiry is already bypassed above, so this covers
            // a malformed or unverifiable token, which answered 401/404. The
            // status stays the 202 a valid token gets - the point is that the
            // two are indistinguishable.
            if (isJWTError(e)) {
                event.response.status = 202;
                return null;
            }

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
