/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The render contract between this package and its host (server-core).
 *
 * The host resolves the built dist at runtime (`dist/server/server.js`
 * exports `render`; `dist/client/` holds the template + assets) and
 * compiles against these types only. Everything else in this package is
 * an implementation detail of the rendered app.
 */

import type { IClient } from '@authup/core-http-kit';

/**
 * The runtime version of the contract described in this file, re-exported
 * from the server bundle so the host can check it before rendering.
 *
 * Bump it whenever a change here breaks a package built against the
 * previous shape (a new required field the host will read, a changed
 * return shape). Additive, optional changes do not bump.
 *
 * Types alone protect this boundary only at compile time: the host calls
 * whatever function the resolved bundle exports, so a custom package built
 * against an older contract would otherwise fail per request on
 * `/authorize` rather than at boot with an actionable message.
 */
export const CONTRACT_VERSION = 3;

/*
 * History:
 *
 * 3 - the `/authorize` payload carries `federatedLogin: { providerId }` and
 *     the page has to complete it with a payload-less, same-origin
 *     `POST /identity-providers/:id/login-complete`. The pending login rides
 *     the HttpOnly `authup_federated_login` cookie the callback set, so the
 *     page presents nothing itself (plan 094). The federated callback no
 *     longer mints the application's code, so a package that ignores the
 *     field strands every federated login on the login form. The interstitial
 *     route from version 2 stays exported but the host no longer renders it.
 *
 * 2 - the host renders `/identity-providers/:id/authorize-in` (the federated
 *     callback's interstitial for a non-http(s) redirect_uri) with a payload
 *     of `{ redirect, authorizeUrl, client }`; a package without that route
 *     renders an empty view for such a completion.
 * 1 - the workflow pages (`/authorize`, `/register`, `/activate`,
 *     `/password-forgot`, `/password-reset`, `/logout`).
 */

export type HydrationPayload<T extends Record<string, any> = Record<string, any>> = {
    config: {
        baseURL: string,
        [key: string]: any
    },
    data: T,
    /**
     * Results the kit produced during the server render, keyed by request
     * identity. Filled while rendering (the payload is serialized afterwards)
     * and consumed once by the hydrating client.
     */
    hydration?: Record<string, any>
};

/**
 * The payload of `/identity-providers/:id/authorize-in`, the federated
 * callback's interstitial for a non-http(s) redirect_uri (contract 2): the
 * verified target carrying the code, the hosted authorize URL of the same
 * code request (the page swaps the consumed callback URL for it in the
 * history), and the client's display data.
 */
export type IdentityProviderCallbackPayload = {
    redirect: string,
    authorizeUrl: string,
    client: {
        id: string,
        name: string,
        displayName: string | null
    }
};

export type RenderContext = {
    url: string,
    manifest: Record<string, string[]>,
    payload: HydrationPayload,
    /**
     * Pre-built HTTP client handed to the Vue app instead of one
     * constructed from payload.config.baseURL (host self-call rewrite,
     * test injection).
     */
    httpClient?: IClient
};

/**
 * `[appHtml + payloadScript, preloadLinks]` — the window-payload escaping
 * happens inside `render()`, so the host only splices the two strings
 * into the template.
 */
export type RenderResult = [html: string, preloadLinks: string];

export type RenderFunction = (ctx: RenderContext) => Promise<RenderResult>;
