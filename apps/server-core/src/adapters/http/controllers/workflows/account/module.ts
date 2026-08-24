/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CLIENT_ACCOUNT_CONSOLE_NAME } from '@authup/core-kit';
import type { Session } from '@authup/core-kit';
import type { IClient } from '@authup/core-http-kit';
import { BadRequestError, InternalError } from '@authup/errors';
import { createNanoID, getURLBasePath } from '@authup/kit';
import type { Logger } from '@authup/server-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import {
    OAuth2ErrorCode,
    OAuth2SubKind,
    OAuth2TokenKind,
    serializeOAuth2Scope,
} from '@authup/specs';
import { setResponseCookie, unsetResponseCookie, useRequestCookie } from '@routup/basic/cookie';
import { setSessionCookie } from '../../../cookie/index.ts';
import { useRequestQuery } from '@routup/basic/query';
import {
    DContext,
    DController,
    DGet,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import { sendRedirect } from 'routup';
import {
    CONSOLE_LOGIN_COOKIE,
    CONSOLE_LOGIN_TTL,
    SYSTEM_CLIENT_SCOPE_NAMES,
    createOAuth2PKCE,
    createSessionSecret,
} from '../../../../../core/index.ts';
import type {
    IConsoleLoginStore,
    IOAuth2TokenRevoker,
    IOAuth2TokenVerifier,
    ISessionManager,
    ISessionRepository,
} from '../../../../../core/index.ts';
import { UI_HTTP_CLIENT_FACTORY_STORE_KEY } from '../../../middleware/index.ts';
import {
    isSameOriginRequest,
} from '../../../request/index.ts';
import { serveAccountConsolePage } from '../../../ui/index.ts';
import type { AccountControllerContext, AccountControllerOptions } from './types.ts';

/**
 * The OAuth2 error codes the callback echoes back to the console. Closed on
 * purpose: everything else collapses into one generic marker, so nothing a
 * redirect carries reaches a rendered page as-is.
 *
 * `access_denied` is the one the console renders specially (an accessPolicyId
 * on the `account-console` client); the other two land on the same generic
 * notice but say something true in a log or a bug report.
 */
const CALLBACK_ERROR_CODES : string[] = [
    OAuth2ErrorCode.ACCESS_DENIED,
    OAuth2ErrorCode.LOGIN_REQUIRED,
    OAuth2ErrorCode.CONSENT_REQUIRED,
];

/**
 * Serves the account console SPA (`@authup/client-account-console`) shell.
 * client-side routing owns the sub-paths, so every route returns the same
 * shell with the runtime config (apiUrl, base path, feature flags) injected.
 * The bundle's static assets ride the assets middleware (/account/assets).
 *
 * It also owns the console's server-side login (plan 088): the kick, the code
 * redemption and the session endpoint the console hydrates from. Those three
 * exist so no OAuth2 token ever reaches the console's JavaScript. The browser
 * holds an opaque, `HttpOnly` credential naming its `auth_sessions` row
 * instead.
 */
@DController('/account')
export class AccountController {
    protected options: AccountControllerOptions;

    protected loginStore: IConsoleLoginStore;

    protected sessionRepository: ISessionRepository;

    protected sessionManager: ISessionManager;

    protected tokenVerifier: IOAuth2TokenVerifier;

    protected tokenRevoker: IOAuth2TokenRevoker;

    protected logger?: Logger;

    constructor(ctx: AccountControllerContext) {
        this.options = ctx.options;
        this.loginStore = ctx.loginStore;
        this.sessionRepository = ctx.sessionRepository;
        this.sessionManager = ctx.sessionManager;
        this.tokenVerifier = ctx.tokenVerifier;
        this.tokenRevoker = ctx.tokenRevoker;
        this.logger = ctx.logger;
    }

    // ---------------------------------------------------------
    // The four routes below MUST stay declared before `/:page`,
    // which matches any single segment and would swallow them.
    // ---------------------------------------------------------

    /**
     * Start a console login: mint PKCE + `state`, park them in the pending
     * login, and send the browser to `/authorize`.
     *
     * The verifier never reaches the browser, which is what moves the code
     * exchange server-side: the callback is the only party that can redeem the
     * code it comes back with.
     */
    @DGet('/login', [])
    async login(@DContext() event: IAppEvent): Promise<Response> {
        const realmId = useRequestQuery(event, 'realmId');
        if (typeof realmId !== 'string' || realmId.length === 0) {
            // The console client is identified by NAME, and a name needs a
            // realm hint at `/authorize` and at `/token` alike. The console
            // asks the visitor for a realm before it links here, so a missing
            // one is a broken caller rather than a user mistake.
            throw new BadRequestError('A realm is required to sign in.');
        }

        const pkce = await createOAuth2PKCE();
        const state = createNanoID();
        const redirectUri = this.buildCallbackURL();

        const id = await this.loginStore.save({
            state,
            codeVerifier: pkce.code_verifier,
            redirectUri,
            realmId,
        });

        this.setLoginCookie(event, id);

        const url = new URL(`${this.trimmedBaseURL()}/authorize`);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('client_id', CLIENT_ACCOUNT_CONSOLE_NAME);
        url.searchParams.set('realm_id', realmId);
        url.searchParams.set('scope', serializeOAuth2Scope(SYSTEM_CLIENT_SCOPE_NAMES));
        url.searchParams.set('redirect_uri', redirectUri);
        url.searchParams.set('state', state);
        url.searchParams.set('code_challenge', pkce.code_challenge);
        url.searchParams.set('code_challenge_method', pkce.code_challenge_method);
        // The default the console's client-side kick sends today, so a
        // lingering session still offers "continue as / use another account".
        url.searchParams.set('prompt', 'select_account');

        event.response.headers.set('cache-control', 'no-store');

        return sendRedirect(event, url.href);
    }

    /**
     * Redeem the authorization code and hand the browser its session cookie.
     *
     * Nothing token-shaped leaves this method: the pair is verified, used to
     * find the session it belongs to, and revoked before the response is
     * built. What the browser gets back is the opaque `auth_sessions.secret`.
     */
    @DGet('/callback', [])
    async callback(@DContext() event: IAppEvent): Promise<Response> {
        // Finding 4 of plan 088. Without this, an attacker who plants their
        // own login cookie in the victim's browser from a sibling subdomain
        // and then navigates them here logs the VICTIM into the ATTACKER's
        // account. Every real flow arrives from the same-origin `/authorize`
        // document, so nothing legitimate is refused.
        if (!isSameOriginRequest(event, this.options.baseURL, { logger: this.logger })) {
            throw new BadRequestError('The login request did not originate from this origin.');
        }

        const pendingId = useRequestCookie(event, CONSOLE_LOGIN_COOKIE);

        // Cleared whichever way this goes: it is single use, and a cookie
        // outliving its pending login only produces a confusing refusal on
        // some later page load.
        this.unsetLoginCookie(event);

        if (typeof pendingId !== 'string' || pendingId.length === 0) {
            return this.refuse(event, OAuth2ErrorCode.INVALID_REQUEST);
        }

        const query = useRequestQuery(event);

        // Read before consuming: one browser holds one login cookie, so a
        // second tab's kick replaces the first tab's id. A stale callback that
        // consumed first would burn the live login of the tab that is still
        // waiting.
        const pending = await this.loginStore.find(pendingId);
        if (!pending) {
            return this.refuse(event, OAuth2ErrorCode.INVALID_REQUEST);
        }

        if (typeof query.state !== 'string' || query.state !== pending.state) {
            return this.refuse(event, OAuth2ErrorCode.INVALID_REQUEST);
        }

        const consumed = await this.loginStore.consume(pendingId);
        if (!consumed) {
            // Lost a race with another callback carrying the same state.
            return this.refuse(event, OAuth2ErrorCode.INVALID_REQUEST);
        }

        if (typeof query.error === 'string' && query.error.length > 0) {
            return this.refuse(event, this.mapCallbackError(query.error));
        }

        if (typeof query.code !== 'string' || query.code.length === 0) {
            return this.refuse(event, OAuth2ErrorCode.INVALID_REQUEST);
        }

        let payload : OAuth2TokenPayload;
        let session : Session | null;

        try {
            const client = this.resolveHttpClient(event);

            // RFC 6749 §4.1.3: the token request repeats the `redirect_uri`
            // the authorization request carried, and the verifier compares the
            // raw stored string, so it is replayed from the pending login,
            // never rebuilt from this URL.
            const grant = await client.token.createWithAuthorizationCode({
                code: query.code,
                redirect_uri: consumed.redirectUri,
                client_id: CLIENT_ACCOUNT_CONSOLE_NAME,
                realm_id: consumed.realmId,
                code_verifier: consumed.codeVerifier,
            });

            payload = await this.tokenVerifier.verify(grant.access_token);

            // Both tokens die here, not just the refresh token: an access
            // token stays a live bearer for its whole lifetime, and the point
            // of this flow is that no token outlives the redemption. The
            // session the pair belongs to is what the browser keeps.
            await this.revokeGrant(grant.access_token, grant.refresh_token);
        } catch (e) {
            this.logger?.warn(`The console login could not be completed: ${e}`);

            return this.refuse(event, OAuth2ErrorCode.INVALID_GRANT);
        }

        if (
            payload.kind !== OAuth2TokenKind.ACCESS ||
            payload.sub_kind !== OAuth2SubKind.USER ||
            !payload.sub ||
            !payload.session_id ||
            !payload.client_id ||
            !payload.scope
        ) {
            return this.refuse(event, OAuth2ErrorCode.INVALID_GRANT);
        }

        try {
            session = await this.sessionManager.findOneById(payload.session_id);
        } catch {
            session = null;
        }

        if (!session) {
            return this.refuse(event, OAuth2ErrorCode.INVALID_GRANT);
        }

        const ttl = new Date(session.expiresAt).getTime() - Date.now();
        if (ttl <= 0) {
            return this.refuse(event, OAuth2ErrorCode.INVALID_GRANT);
        }

        const secret = createSessionSecret();
        await this.sessionRepository.updateSecret(session.id, secret);

        setSessionCookie(event, this.options.baseURL, secret, ttl);

        event.response.headers.set('cache-control', 'no-store');

        return sendRedirect(event, this.buildConsoleURL());
    }

    @DGet('', [])
    async serve(@DContext() event: IAppEvent): Promise<string> {
        return this.render(event);
    }

    @DGet('/:page', [])
    async servePage(@DContext() event: IAppEvent): Promise<string> {
        return this.render(event);
    }

    protected render(event: IAppEvent): Promise<string> {
        return serveAccountConsolePage(event, {
            baseURL: this.options.baseURL,
            features: this.options.features,
            trustedOrigins: this.options.trustedOrigins,
        });
    }

    // ---------------------------------------------------------

    protected resolveHttpClient(event: IAppEvent) : IClient {
        const factory = event.store[UI_HTTP_CLIENT_FACTORY_STORE_KEY] as (() => IClient) | undefined;
        if (!factory) {
            throw new InternalError('No http client is available to redeem the authorization code.');
        }

        return factory();
    }

    /**
     * Revoke what the exchange returned. Best effort per token: a revoke that
     * fails must not leave the visitor without a session, and both tokens are
     * unreachable to anyone but this process either way.
     */
    protected async revokeGrant(accessToken: string, refreshToken?: string) : Promise<void> {
        const tokens = refreshToken ? [accessToken, refreshToken] : [accessToken];

        for (const token of tokens) {
            try {
                const payload = await this.tokenVerifier.verify(token, { skipActiveCheck: true });

                await this.tokenRevoker.revoke(payload);
            } catch (e) {
                this.logger?.warn(`A console login token could not be revoked: ${e}`);
            }
        }
    }

    protected mapCallbackError(input: string) : `${OAuth2ErrorCode}` {
        if (CALLBACK_ERROR_CODES.includes(input)) {
            return input as `${OAuth2ErrorCode}`;
        }

        return OAuth2ErrorCode.INVALID_REQUEST;
    }

    /**
     * Land a refusal on the console rather than in a JSON body: this is a
     * top-level navigation at the end of a login, and the person behind it has
     * to be told something. The marker set is closed, so nothing
     * attacker-shaped is echoed.
     */
    protected refuse(event: IAppEvent, error: `${OAuth2ErrorCode}`) : Response {
        const params = new URLSearchParams({ error });

        event.response.headers.set('cache-control', 'no-store');

        return sendRedirect(event, `${this.buildConsoleURL()}?${params.toString()}`);
    }

    // ---------------------------------------------------------


    protected trimmedBaseURL() : string {
        return this.options.baseURL.replace(/\/+$/, '');
    }

    protected basePath() : string {
        return getURLBasePath(this.options.baseURL);
    }

    protected buildConsoleURL() : string {
        return `${this.basePath()}/account`;
    }

    protected buildCallbackURL() : string {
        return `${this.trimmedBaseURL()}/account/callback`;
    }

    /**
     * Whether the cookies may carry the `Secure` flag. Read from the parsed
     * URL rather than the raw string: `publicUrl` is validated but never
     * canonicalized, so a configured `HTTPS://...` would leave a prefix test
     * false and silently drop the flag.
     */
    protected isSecureBaseURL() : boolean {
        try {
            return new URL(this.options.baseURL).protocol === 'https:';
        } catch {
            return false;
        }
    }

    /**
     * Scoped to the routes that read it, so it never rides an ordinary API
     * request, and `SameSite=Lax` because the return leg is a top-level
     * navigation that may come back through an external identity provider,
     * which a `Strict` cookie would not accompany. It holds nothing but the id
     * of a single-use cache entry.
     */
    protected buildLoginCookiePath() : string {
        return `${this.basePath()}/account`;
    }

    protected setLoginCookie(event: IAppEvent, value: string) : void {
        setResponseCookie(event, CONSOLE_LOGIN_COOKIE, value, {
            httpOnly: true,
            sameSite: 'lax',
            secure: this.isSecureBaseURL(),
            path: this.buildLoginCookiePath(),
            maxAge: CONSOLE_LOGIN_TTL / 1000,
        });
    }

    protected unsetLoginCookie(event: IAppEvent) : void {
        unsetResponseCookie(event, CONSOLE_LOGIN_COOKIE, { path: this.buildLoginCookiePath() });
    }
}
