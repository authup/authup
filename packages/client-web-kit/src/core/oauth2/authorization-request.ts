/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2AuthorizationPrompt } from '@authup/specs';

const STORAGE_KEY = 'authup.authorization-request';

/**
 * The state persisted between the `/authorize` redirect and the callback.
 * `state` guards against CSRF and `code_verifier` is the PKCE secret, so both
 * have to stay in the browser that started the flow. `redirect_uri` is here
 * because it must be replayed byte-for-byte at the `/token` exchange
 * (RFC 6749 §4.1.3) — take it from here, never rebuild it from
 * `window.location`, which by then carries the appended `code` and `state`
 * and a re-serialized query.
 *
 * The post-login destination is deliberately NOT stored here. It rides in the
 * `redirect_uri`'s own query (`<origin>/login/callback?redirect=%2Fusers`), so
 * the authorization server carries it back and any client can use the same
 * mechanism without agreeing on a storage convention.
 */
export type AuthorizationRequest = {
    state: string,
    code_verifier: string,
    redirect_uri: string,
    client_id: string,
    realm_id?: string
};

export function saveAuthorizationRequest(request: AuthorizationRequest): void {
    if (typeof sessionStorage === 'undefined') {
        return;
    }

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(request));
}

export function loadAuthorizationRequest(): AuthorizationRequest | undefined {
    if (typeof sessionStorage === 'undefined') {
        return undefined;
    }

    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return undefined;
    }

    try {
        return JSON.parse(raw) as AuthorizationRequest;
    } catch {
        return undefined;
    }
}

export function clearAuthorizationRequest(): void {
    if (typeof sessionStorage === 'undefined') {
        return;
    }

    sessionStorage.removeItem(STORAGE_KEY);
}

export type BuildAuthorizeURLContext = {
    baseURL: string,
    clientId: string,
    realmId?: string,
    redirectUri: string,
    scope?: string,
    state: string,
    codeChallenge: string,
    codeChallengeMethod: string,
    /**
     * OIDC `prompt`. Defaults to `select_account` so a lingering session offers
     * "continue as / use another account" instead of silently continuing. Pass
     * `''` to opt out, or `none`/`login` for silent-auth / forced re-auth.
     */
    prompt?: string,
    maxAge?: number,
    loginHint?: string
};

export function buildAuthorizeURL(ctx: BuildAuthorizeURLContext): string {
    const base = ctx.baseURL.replace(/\/+$/, '');

    const params = new URLSearchParams();
    params.set('response_type', 'code');
    params.set('client_id', ctx.clientId);
    if (ctx.realmId) {
        params.set('realm_id', ctx.realmId);
    }
    params.set('scope', ctx.scope ?? 'global openid');
    params.set('redirect_uri', ctx.redirectUri);
    params.set('state', ctx.state);
    params.set('code_challenge', ctx.codeChallenge);
    params.set('code_challenge_method', ctx.codeChallengeMethod);

    const prompt = ctx.prompt ?? OAuth2AuthorizationPrompt.SELECT_ACCOUNT;
    if (prompt) {
        params.set('prompt', prompt);
    }
    if (typeof ctx.maxAge !== 'undefined') {
        params.set('max_age', String(ctx.maxAge));
    }
    if (ctx.loginHint) {
        params.set('login_hint', ctx.loginHint);
    }

    return `${base}/authorize?${params.toString()}`;
}

export type BuildEndSessionURLContext = {
    baseURL: string,
    idTokenHint?: string,
    clientId?: string,
    postLogoutRedirectUri?: string,
    state?: string,
    realmId?: string
};

/**
 * Build an OIDC RP-Initiated Logout URL for the `end_session_endpoint`.
 */
export function buildEndSessionURL(ctx: BuildEndSessionURLContext): string {
    const base = ctx.baseURL.replace(/\/+$/, '');

    const params = new URLSearchParams();
    if (ctx.idTokenHint) {
        params.set('id_token_hint', ctx.idTokenHint);
    }
    if (ctx.clientId) {
        params.set('client_id', ctx.clientId);
    }
    if (ctx.postLogoutRedirectUri) {
        params.set('post_logout_redirect_uri', ctx.postLogoutRedirectUri);
    }
    if (ctx.state) {
        params.set('state', ctx.state);
    }
    if (ctx.realmId) {
        params.set('realm_id', ctx.realmId);
    }

    const qs = params.toString();
    return `${base}/logout${qs ? `?${qs}` : ''}`;
}

export type BuildConsoleLoginURLContext = {
    baseURL: string,
    /**
     * The console whose login is being started. Its OAuth2 client and its
     * return target are what differ per console, which is why this half of the
     * flow is per-console while the session it produces is not (plan 088).
     */
    console?: string,
    realmId?: string
};

/**
 * Build the URL of a console's server-side login kick.
 *
 * A NAVIGATION target rather than a request, like `buildAuthorizeURL` and
 * `buildEndSessionURL` beside it: the whole point of the server-side flow is
 * that the PKCE verifier is minted where JavaScript cannot see it, so the
 * browser is handed to the server rather than calling it. Hand-assembling the
 * string at the call site is what this replaces.
 */
export function buildConsoleLoginURL(ctx: BuildConsoleLoginURLContext): string {
    const base = ctx.baseURL.replace(/\/+$/, '');
    const target = ctx.console || 'account';

    const params = new URLSearchParams();
    if (ctx.realmId) {
        params.set('realmId', ctx.realmId);
    }

    const qs = params.toString();
    return `${base}/${target}/login${qs ? `?${qs}` : ''}`;
}
