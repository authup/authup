/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    OAuth2TokenGrantResponse,
    OAuth2TokenIntrospectionResponse,
    OAuth2TokenPayload,
} from '@authup/specs';
import {
    OAuth2ClientError,
    OAuth2GrantTypeError,
    OAuth2RequestError,
    OAuth2TokenGrant,
    OAuth2TokenKind,
    isJWTError,
} from '@authup/specs';
import { 
    ClientAuthMethod, 
    IdentityType, 
    PermissionName, 
    ScopeName, 
} from '@authup/core-kit';
import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { readRequestBody } from '@routup/basic/body';
import {
    DContext,
    DController,
    DGet,
    DPost,
    DTags,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import type { Logger } from '@authup/server-kit';
import { toOAuth2Error } from '../../../../../core/oauth2/helpers/index.ts';
import type { TokenControllerContext } from './types.ts';
import type {
    IAuthFlowMetrics,
    IIdentityPermissionProvider,
    IIdentityResolver,
    IOAuth2TokenIssuer,
    IOAuth2TokenRevoker,
    IOAuth2TokenVerifier,
    OAuth2ClientAuthenticator,
} from '../../../../../core/index.ts';
import { resolveIntrospectionSubject } from '../../../../../core/index.ts';
import type { IHTTPOAuth2Grant } from '../../../adapters/index.ts';
import {
    HTTPClientCredentialsGrant,
    HTTPOAuth2AuthorizeGrant,
    HTTPOAuth2RefreshTokenGrant,
    HTTPPasswordGrant,
    extractClientCredentialsFromRequest,
    extractOAuth2ClientCertificateEvidence,
    guessOauth2GrantTypeByRequest,
    readRealmHint,
} from '../../../adapters/index.ts';
import type { CertificateSource } from '../../../request/index.ts';
import {
    buildActorContext,
    setRequestIdentity,
    setRequestScopes,
    useRequestIdentity,
    useRequestIdentityOrFail,
} from '../../../request/index.ts';
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

    protected clientAuthenticator : OAuth2ClientAuthenticator;

    protected certificateSource : CertificateSource;

    protected logger? : Logger;

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
        this.clientAuthenticator = ctx.oauth2ClientAuthenticator;
        this.certificateSource = ctx.certificateSource;
        this.logger = ctx.logger;

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
        await this.assertIntrospectionAuthorized(event);

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

            if (payload.kind === OAuth2TokenKind.LOGOUT) {
                // A back-channel logout token verifies (it is signed with the
                // realm key) but is a notification, never a credential: no
                // endpoint accepts it as a bearer, so it is reported dead
                // rather than raised (RFC 7662 §2.2), bare like any other.
                return { active: false };
            }

            if (!await this.isIntrospectionAllowed(event, payload)) {
                // RFC 7662 §2.2's third clause: a caller "not allowed to
                // introspect" the token is answered like a dead one,
                // indistinguishable and bare.
                return { active: false };
            }

            if (!payload.sub || !payload.sub_kind) {
                // Not a report about a token this server ever issued: authup
                // mints every one with a subject, so a verifying token without
                // one was never valid. `active: false` would claim we knew it
                // and let it lapse.
                throw OAuth2RequestError.identityInvalid();
            }

            // Both halves, fail-closed on a missing claim: a token carrying no
            // `jti` cannot be checked against the revocation list, and one
            // carrying no `exp` cannot be shown to be current. Authup mints
            // every token with both. Derived BEFORE the permission read so a
            // dead token never pays for one.
            let active : boolean;
            if (payload.jti && typeof payload.exp === 'number') {
                const isInactive = await this.tokenVerifier.isInactive(payload.jti);
                active = !isInactive && payload.exp * 1000 > Date.now();
            } else {
                active = false;
            }

            // An inactive token reports WHO it belonged to and nothing about
            // what they may do (RFC 7662 §2.2 / §4): naming the subject is the
            // point of reading an expired token at all, handing over their
            // authorization set is not. It also skips resolving that set for
            // a token nobody can use - which is why `active` is passed in
            // rather than the permissions being dropped afterwards.
            const subject = await resolveIntrospectionSubject({
                identityResolver: this.identityResolver,
                identityPermissionProvider: this.identityPermissionProvider,
            }, {
                sub: payload.sub,
                subKind: payload.sub_kind,
                clientId: payload.client_id,
                realmId: payload.realm_id,
                active,
            });

            if (!active) {
                return {
                    active,
                    ...payload,
                    ...subject.claims,
                };
            }

            return {
                active,
                // todo: permissions property should be removed.
                permissions: subject.permissions,
                ...payload,
                ...subject.claims,
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

    /**
     * RFC 7662 §2.1: the endpoint MUST require authorization, "such as client
     * authentication [...] or a separate OAuth 2.0 access token". The
     * credential has to be INDEPENDENT of the token being introspected, since
     * possession of that string is exactly what a finder has too (#3489): a
     * request identity the authorization middleware resolved (the kit's own
     * live bearer, a resource server's client-credentials bearer, Basic), or
     * confidential client credentials as the grants read them. A bare public
     * `client_id` identifies and authenticates nothing, so it is refused like
     * the client-credentials grant refuses it.
     *
     * An expired bearer never reaches this point: the middleware answers 401
     * before the route runs. So the expired report in `postIntrospect` is only
     * ever handed to a caller that proved who it is, which is what makes it
     * safe to give.
     */
    protected async assertIntrospectionAuthorized(event: IAppEvent) : Promise<void> {
        if (useRequestIdentity(event)) {
            return;
        }

        const { clientId, clientSecret } = await extractClientCredentialsFromRequest(event);
        if (!clientId) {
            useRequestIdentityOrFail(event);
            return;
        }

        const body = await readRequestBody(event);
        const certificateEvidence = await extractOAuth2ClientCertificateEvidence(event, this.certificateSource);
        const client = await this.clientAuthenticator.authenticate(
            clientId,
            clientSecret,
            readRealmHint(body),
            certificateEvidence,
        );
        if (client.authMethod === ClientAuthMethod.NONE) {
            throw OAuth2ClientError.invalid();
        }

        // the authorization layer below reads the request identity, so the
        // credential-authenticated client becomes one, exactly as the
        // middleware's `clientAuthBasic` branch would have set it.
        setRequestScopes(event, [ScopeName.GLOBAL]);
        setRequestIdentity(event, {
            type: IdentityType.CLIENT,
            data: client,
        });
    }

    /**
     * WHOSE tokens the authenticated caller may introspect (#3489, second
     * layer): its own subject's, those issued for its own client, or any its
     * TOKEN_INTROSPECT grant reaches (the grant's realm scope is matched
     * against the token's realm claim, so an `admin` reaches everything and
     * a `realm_admin` its own realm). A resource server verifying foreign
     * tokens through the server adapters' remote mode needs that grant. The
     * deny is reported per RFC 7662 §2.2 as a bare `active: false`, which
     * gives the caller nothing to diagnose with, hence the log line.
     */
    protected async isIntrospectionAllowed(
        event: IAppEvent,
        payload: OAuth2TokenPayload,
    ) : Promise<boolean> {
        const identity = useRequestIdentity(event);
        if (!identity) {
            return false;
        }

        if (
            payload.sub &&
            identity.type === payload.sub_kind &&
            identity.id === payload.sub
        ) {
            return true;
        }

        if (
            identity.type === IdentityType.CLIENT &&
            payload.client_id &&
            identity.id === payload.client_id
        ) {
            return true;
        }

        const actor = buildActorContext(event);
        try {
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.TOKEN_INTROSPECT,
                data: new PolicyData({ ...(payload.realm_id ? { [BuiltInPolicyType.REALM_MATCH]: payload.realm_id } : {}) }),
            });
            return true;
        } catch {
            this.logger?.info(
                `introspection denied: ${identity.type} ${identity.id} may not introspect the presented token`,
            );
            return false;
        }
    }

    // ----------------------------------------------------------

    /**
     * Deliberately ungated, unlike introspection (#3489). RFC 7009 §2.1 asks
     * the client to send its credentials (a bare `client_id` for a public
     * client) and the server to verify the token was issued to that client;
     * authup knowingly skips both. A public `client_id` identifies and
     * proves nothing, so an ownership check built on it would be advisory,
     * the consoles are public clients whose kit revokes anonymously on
     * logout teardown, revoking a token one possesses is the benign action,
     * and the uniform 200 below leaves a scanner nothing to learn.
     */
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

            // RFC 7009 §2.2 names 200 for a successful revocation. This was a
            // 202 - within the 2xx family, so a client reading the class was
            // unaffected, but not the status the spec asks for.
            event.response.status = 200;
            return null;
        } catch (e) {
            // Same clause, the other half: "invalid tokens do not cause an
            // error response since the client cannot handle such an error in a
            // reasonable way". Expiry is already bypassed above, so this covers
            // a malformed or unverifiable token, which answered 401/404. The
            // answer is the one a valid token gets - the point is that the two
            // are indistinguishable.
            if (isJWTError(e)) {
                event.response.status = 200;
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
