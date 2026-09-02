/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Client,
    OAuth2AuthorizationCodeRequest,
    Realm,
    Scope,
} from '@authup/core-kit';
import type {
    OAuth2TokenGrantResponse,
    OAuth2TokenIntrospectionResponse,
} from '@authup/specs';
import type {
    AuthorizeParameters,
    ClientAuthenticationParameters,
    Options,
    TokenAuthorizationCodeGrantParameters,
    TokenBaseOptions,
    TokenClientCredentialsGrantParameters,
    TokenGrantParameters,
    TokenIntrospectParameters,
    TokenPasswordGrantParameters,
    TokenRefreshTokenGrantParameters,
    TokenRevokeParameters,
} from '@hapic/oauth2';
import type { AuthorizationHeader, Response } from 'hapic';
import type { StatusResponseFeatures } from '../status';

/**
 * The OAuth2 protocol mechanics (and their parameter shapes) are owned
 * by @hapic/oauth2 — authup only re-exposes them under its naming
 * convention so the contracts below stay expressible without consumers
 * depending on @hapic/oauth2 directly.
 */
export type OAuth2APIOptions = Options;

export type OAuth2ClientAuthenticationParameters = ClientAuthenticationParameters;

export type OAuth2TokenClientCredentialsGrantParameters = TokenClientCredentialsGrantParameters;
/**
 * The `otp` field is an authup extension (not part of the RFC 6749 password
 * grant): a user holding a confirmed second factor supplies a TOTP or
 * recovery code alongside their credentials so the grant is not rejected
 * with `mfa_required`. It rides as an extra form field — the token request
 * transport serializes every string parameter.
 */
export type OAuth2TokenPasswordGrantParameters = TokenPasswordGrantParameters & {
    otp?: string,
};
export type OAuth2TokenAuthorizationCodeGrantParameters = TokenAuthorizationCodeGrantParameters;
export type OAuth2TokenRefreshTokenGrantParameters = TokenRefreshTokenGrantParameters;
export type OAuth2TokenGrantParameters = TokenGrantParameters;

export type OAuth2TokenRevokeParameters = TokenRevokeParameters;
export type OAuth2TokenIntrospectParameters = TokenIntrospectParameters;
export type OAuth2TokenRequestOptions = TokenBaseOptions;

export type OAuth2AuthorizeParameters = Partial<AuthorizeParameters>;

/**
 * The client as an anonymous visitor may see it. `GET /authorize` and
 * `GET /authorize/info` are both unauthenticated, so the row is trimmed
 * to these five fields before it leaves the server: never the
 * redirect_uri patterns (the trusted-origin set), the grant types, the
 * home URL, the back-channel logout endpoint, the authentication method
 * or the secret storage flags.
 */
export type ClientSummary = Pick<Client, 'id' | 'name' | 'displayName' | 'builtIn' | 'createdAt'>;

/**
 * The client's realm, named so a page can render the realm-mismatch
 * notice (`codeRequest.realm_id` carries only the id).
 */
export type RealmSummary = Pick<Realm, 'id' | 'name' | 'displayName'>;

/**
 * A refusal as it travels: the sanitized error's own enumerable
 * attributes plus its `message`, which an Error does not carry as one.
 *
 * It is NOT an `Error`. Nothing survives the JSON trip but data, so an
 * `instanceof Error` check against it is always false, and `name` and
 * `stack` are absent. `code` is the discriminator to branch on; the
 * remaining attributes are whatever the error class carries (`issues`
 * on a validation failure, `data` on an OAuth2 one).
 */
export type AuthorizeInfoError = {
    message: string,
    code?: string,
    [key: string]: any,
};

/**
 * The complete render input of the hosted `/authorize` page: what the
 * code-request verifier resolved, plus the feature flags and the request
 * path the page hands to its register / password-forgot links.
 *
 * A refused request is not an error response. It answers with `error`
 * filled and the resolved fields absent, exactly as the page renders it,
 * so a caller renders the refusal instead of failing.
 */
export type AuthorizeInfo = {
    codeRequest?: OAuth2AuthorizationCodeRequest,
    error?: AuthorizeInfoError,
    client?: ClientSummary,
    scopes?: Scope[],
    realm?: RealmSummary,
    /**
     * Whether the request `redirect_uri` matched a registered client
     * pattern. False means the page must not offer a redirect back to
     * the application.
     */
    redirectUriVerified: boolean,
    /**
     * A federated login waiting to be completed (plan 094). Only the
     * provider is named; the pending login itself rides a cookie.
     */
    federatedLogin?: { providerId: string },
    features: StatusResponseFeatures,
    /**
     * Path and query of the authorize request, `provider` stripped. A
     * page carries it as the same-origin `redirect` parameter on the
     * register / password links, so those lead back into this request.
     */
    requestPath: string,
};

/**
 * What `POST /logout` answers a JSON caller with (plan 101 D2).
 *
 * The end_session_endpoint keeps its two OIDC browser bindings, which
 * redirect to wherever the auth console is served; this is the shape the
 * rendered page gets when it asks for the session to be ended.
 *
 * The three hint fields are the operands of the page's auto-clear gate:
 * it may tear the browser's own session down only when the server really
 * revoked a session AND that session's subject is this browser's user.
 * They are answered to the page's own request rather than carried in a
 * URL for exactly that reason, since a URL-borne `hintSub` would be
 * attacker-suppliable and the gate would decide nothing.
 */
export type EndSessionResponse = {
    /**
     * The client the hint or the request identified, for the page to name.
     */
    clientName?: string,
    /**
     * Whether the `id_token_hint` verified. Claims are reflected only when
     * it did.
     */
    hintVerified?: boolean,
    hintSub?: string,
    hintSubKind?: string,
    /**
     * Whether a session was actually revoked here.
     */
    serverRevoked: boolean,
    /**
     * The validated `post_logout_redirect_uri`, `state` already applied.
     * The page navigates it only after its own sign-out has run.
     */
    redirect?: string,
};

// ------------------------------------------------------------------

export interface IOAuth2TokenAPI {
    createWithRefreshToken(
        parameters: Omit<OAuth2TokenRefreshTokenGrantParameters, 'grant_type'>,
        options?: OAuth2TokenRequestOptions,
    ) : Promise<OAuth2TokenGrantResponse>;

    createWithClientCredentials(
        parameters?: Omit<OAuth2TokenClientCredentialsGrantParameters, 'grant_type'>,
        options?: OAuth2TokenRequestOptions,
    ) : Promise<OAuth2TokenGrantResponse>;

    createWithPassword(
        parameters: Omit<OAuth2TokenPasswordGrantParameters, 'grant_type'>,
        options?: OAuth2TokenRequestOptions,
    ) : Promise<OAuth2TokenGrantResponse>;

    createWithAuthorizationCode(
        parameters: Omit<OAuth2TokenAuthorizationCodeGrantParameters, 'grant_type'>,
        options?: OAuth2TokenRequestOptions,
    ) : Promise<OAuth2TokenGrantResponse>;

    create(
        parameters: OAuth2TokenGrantParameters,
        options?: OAuth2TokenRequestOptions,
    ) : Promise<OAuth2TokenGrantResponse>;

    revoke(
        parameters?: OAuth2TokenRevokeParameters,
        options?: OAuth2TokenRequestOptions,
    ) : Promise<Response>;

    introspect<T extends OAuth2TokenIntrospectionResponse = OAuth2TokenIntrospectionResponse>(
        parameters?: OAuth2TokenIntrospectParameters,
        options?: OAuth2TokenRequestOptions,
    ) : Promise<T>;
}

export interface IOAuth2AuthorizeAPI {
    buildURL(parameters?: OAuth2AuthorizeParameters) : string;

    getInfo(query?: string | Record<string, any>) : Promise<AuthorizeInfo>;

    confirm(data: OAuth2AuthorizationCodeRequest) : Promise<{ url: string }>;
}

export interface IOAuth2UserInfoAPI {
    get<T extends Record<string, any> = Record<string, any>>(
        header?: string | AuthorizationHeader,
    ) : Promise<T>;
}
