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

export type HydrationPayload<T extends Record<string, any> = Record<string, any>> = {
    config: {
        baseURL?: string,
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
