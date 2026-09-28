/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import {
    JWKUse,
    OAuth2GrantError,
    hasOAuth2Scopes,
    isJWTError,
} from '@authup/specs';
import type { OAuth2AuthorizationCode, Session } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import { buildOAuth2TokenHash, deriveAmrAcr } from '../authorization/helpers.ts';
import type { IKeyStore } from '../../key/index.ts';
import type { IOAuth2OpenIDTokenIssuer, IOAuth2TokenIssuer } from '../token/index.ts';
import { isTokenSession, isTokenSubjectActive } from '../token/subject.ts';
import type { IIdentityResolver } from '../../identity/resolver/types.ts';
import { OAuth2BaseGrant } from './base.ts';
import type { IOAuth2Grant, OAuth2AuthorizeGrantContext, OAuth2GrantRunWIthOptions } from './types.ts';
import type { OAuth2BearerResponseBuildContext } from '../response/index.ts';
import { buildOAuth2BearerTokenResponse } from '../response/index.ts';

export class OAuth2AuthorizeGrant extends OAuth2BaseGrant<OAuth2AuthorizationCode> implements IOAuth2Grant {
    protected refreshTokenIssuer : IOAuth2TokenIssuer;

    protected openIdTokenIssuer : IOAuth2OpenIDTokenIssuer;

    protected keyStore : IKeyStore;

    protected identityResolver : IIdentityResolver;

    constructor(ctx: OAuth2AuthorizeGrantContext) {
        super({
            accessTokenIssuer: ctx.accessTokenIssuer,
            sessionManager: ctx.sessionManager,
        });

        this.refreshTokenIssuer = ctx.refreshTokenIssuer;
        this.openIdTokenIssuer = ctx.openIdTokenIssuer;
        this.keyStore = ctx.keyStore;
        this.identityResolver = ctx.identityResolver;
    }

    async runWith(
        authorizationCode: OAuth2AuthorizationCode,
        options: OAuth2GrantRunWIthOptions = {},
    ) : Promise<OAuth2TokenGrantResponse> {
        // A code outlives nothing its subject lost in between: the subject
        // must still exist, be active and belong to the code's realm.
        const identity = authorizationCode.sub && authorizationCode.sub_kind ?
            await this.identityResolver.resolve(authorizationCode.sub_kind, authorizationCode.sub) :
            null;
        if (!isTokenSubjectActive(identity, authorizationCode)) {
            throw OAuth2GrantError.invalid();
        }

        const session = await this.resolveSession(authorizationCode, options);

        // amr/acr derive from the RESOLVED session (authMethod + mfaAt) —
        // deliberately on every token kind, not only the id_token, so
        // resource servers can read the method without parsing an id_token.
        const amrAcr = deriveAmrAcr(session);

        const issuePayload : Partial<OAuth2TokenPayload> = {
            user_agent: options.userAgent,
            remote_address: options.ipAddress,
            session_id: session.id,
            sub: authorizationCode.sub || undefined,
            sub_kind: authorizationCode.sub_kind,
            realm_id: authorizationCode.realm_id,
            realm_name: authorizationCode.realm_name,
            scope: authorizationCode.scope || undefined,
            client_id: authorizationCode.client_id || undefined,
            ...(options.confirmation ? { cnf: options.confirmation } : {}),
            ...amrAcr,
        };

        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue(issuePayload);
        const [refreshToken, refreshTokenPayload] = await this.refreshTokenIssuer.issue(issuePayload);

        const buildContext : OAuth2BearerResponseBuildContext = {
            accessToken,
            accessTokenPayload,
            refreshToken,
            refreshTokenPayload,
        };

        // The id_token is minted HERE — after resolveSession — so its `sid`
        // references the real backing session for the reuse branch and for
        // session-less codes alike.
        // `auth_time` is the authentication instant captured on the code.
        if (
            authorizationCode.scope &&
            hasOAuth2Scopes(authorizationCode.scope, ScopeName.OPEN_ID)
        ) {
            // The at_hash digest follows the id_token's JWS alg (OIDC Core
            // §3.1.3.6) — the alg of the realm key the openid issuer signs
            // with. The access token above was signed with the same key, so a
            // missing key would already have thrown; this resolves the same
            // active key.
            const key = await this.keyStore.resolveOrCreate(authorizationCode.realm_id, JWKUse.SIGNATURE);

            const [idToken] = await this.openIdTokenIssuer.issue({
                sub: authorizationCode.sub || undefined,
                sub_kind: authorizationCode.sub_kind,
                realm_id: authorizationCode.realm_id,
                realm_name: authorizationCode.realm_name,
                scope: authorizationCode.scope || undefined,
                client_id: authorizationCode.client_id || undefined,
                ...(authorizationCode.nonce ? { nonce: authorizationCode.nonce } : {}),
                ...(typeof authorizationCode.auth_time === 'number' ? { auth_time: authorizationCode.auth_time } : {}),
                ...amrAcr,
                sid: session.id,
                at_hash: await buildOAuth2TokenHash(accessToken, key.signatureAlgorithm),
            });

            buildContext.idToken = idToken;
        }

        return buildOAuth2BearerTokenResponse(buildContext);
    }

    /**
     * Reuse the bearer's session when the authorization code was issued from an
     * (interactive) `/authorize` request that carried one — otherwise the
     * interactive login would create a second session (the abandoned bearer
     * session that authenticated `POST /authorize`, plus this one).
     *
     * A code that names a session is redeemed only while that session still
     * exists and belongs to the code's subject and realm: a revoke between
     * issue and redemption (a sign-out, a password change, a deactivation)
     * refuses the code instead of minting a fresh session for it. Only a
     * session-less authorize flow (HTTP Basic) creates one.
     */
    protected async resolveSession(
        authorizationCode: OAuth2AuthorizationCode,
        options: OAuth2GrantRunWIthOptions,
    ) : Promise<Session> {
        if (authorizationCode.session_id) {
            const existing = await this.sessionManager.findOneById(authorizationCode.session_id);
            if (!existing || !isTokenSession(existing, authorizationCode)) {
                throw OAuth2GrantError.invalid('the session has been revoked');
            }

            // `auth_sessions.client_id` is deliberately NOT touched. It
            // is the client-SUBJECT foreign key, the counterpart of
            // `user_id` that `SessionManager.create` populates from `sub`
            // when `subKind` is client, and its ON DELETE CASCADE means
            // "this client owns this row". Writing the authorizing
            // application into it put an unrelated id behind that cascade,
            // so deleting that application deleted a USER's session and,
            // through `auth_session_tokens.session_id`, every other
            // application's tokens on it.
            //
            // Which application authorized is recorded per token, on
            // `auth_session_tokens.client_id`, where a session serving
            // several applications can say so.
            // A session revoked concurrently fails the refresh with a JWT
            // error, which the token endpoint answers as invalid_grant.
            try {
                return await this.sessionManager.refresh(existing);
            } catch (e) {
                if (isJWTError(e)) {
                    throw OAuth2GrantError.invalid('the session has been revoked');
                }

                throw e;
            }
        }

        return this.sessionManager.create({
            userAgent: options.userAgent,
            ipAddress: options.ipAddress,
            realmId: authorizationCode.realm_id,
            subKind: authorizationCode.sub_kind,
            sub: authorizationCode.sub,
            authMethod: authorizationCode.auth_method ?? null,
        });
    }
}
