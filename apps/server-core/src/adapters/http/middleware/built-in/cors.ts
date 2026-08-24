/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Options as CorsOptions } from '@routup/cors';
import { handleCors } from '@routup/cors';
import type { App } from 'routup';
import { defineCoreHandler, getRequestHeader } from 'routup';

export type CorsMiddlewareContext = {
    /**
     * publicUrl. The ONE origin credentialed requests are answered for.
     */
    baseURL: string,
};

export function registerCorsMiddleware(router: App, input: CorsOptions | undefined, ctx: CorsMiddlewareContext) {
    const options : CorsOptions = {
        // Reflect any origin by default: OAuth2 clients (and their UIs) are
        // registered at runtime on arbitrary domains, so a startup-time
        // allowlist cannot know them. Bearer/Basic authentication is carried
        // in a header a cross-origin page cannot make the browser attach on
        // its own, so reflecting the origin adds no exposure for it. Operators
        // can still pass an explicit `origin` via the middlewareCors config
        // options.
        origin: true,
        credentials: true,
        // `credentials: true` is incompatible with the `*` wildcard for
        // exposeHeaders, so enumerate the response headers JS clients need.
        exposeHeaders: [
            'ratelimit-limit',
            'ratelimit-remaining',
            'ratelimit-reset',
            'retry-after',
            'etag',
            'content-disposition',
            'content-range',
            'accept-ranges',
            'location',
            'www-authenticate',
        ],
        ...(input ?? {}),
    };

    let trustedOrigin : string | undefined;
    try {
        trustedOrigin = new URL(ctx.baseURL).origin;
    } catch {
        trustedOrigin = undefined;
    }

    // `access-control-allow-credentials` is emitted ONLY for publicUrl's own
    // origin (plan 088).
    //
    // Cookie-authenticated surfaces exist now (the federated login's
    // `POST /identity-providers/:id/login-complete` (plan 094) and, since
    // plan 088, every route the console session cookie reaches), so
    // "reflect any origin" and "answer credentialed requests" can no longer
    // both hold. `SameSite` does not save it: the attribute is scoped to the
    // registrable domain, so a sibling subdomain is same-SITE, its
    // `fetch(credentials: 'include')` carries the cookie, and a reflected
    // `Allow-Origin` plus `Allow-Credentials` would let it read the reply.
    //
    // `Allow-Origin` keeps reflecting, so every non-credentialed
    // cross-origin caller is unaffected. No authup consumer sets
    // `credentials: 'include'` (neither core-http-kit nor the web kit), and
    // the same-origin console needs no credentials mode, so nothing of
    // authup's own breaks. The narrowing applies to an explicit
    // `middlewareCors` config too: while an ambient cookie is accepted here,
    // there is no supported way to hand another origin the user's session.
    //
    // This narrowing does NOT relieve a cookie-authenticated route of its own
    // origin check (`isSameOriginRequest`). CORS governs what a browser lets
    // a foreign page READ, never what this server ACTS on: a credentialed
    // request whose reply the browser will discard still arrives, and still
    // carries the cookie. Every such surface repeats the check: plan 088's
    // console session and plan 094's login completion both do.
    //
    // A per-request decision, because @routup/cors takes `credentials` as a
    // plain boolean, hence `handleCors` rather than the `cors()` plugin.
    router.use(defineCoreHandler((event) => {
        const origin = getRequestHeader(event, 'origin');
        const credentials = !!options.credentials &&
            !!trustedOrigin &&
            origin === trustedOrigin;

        const response = handleCors(event, { ...options, credentials });
        if (response) {
            return response;
        }

        return event.next();
    }));
}
