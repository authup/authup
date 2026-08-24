/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenIntrospectionResponse } from '@authup/specs';

/**
 * The account console's own session surface (plan 088).
 *
 * Both calls authenticate on the opaque, `HttpOnly` session cookie the
 * server-side login sets, which the browser attaches on its own — there is
 * no token to pass and no credentials mode to opt into, because the console
 * is served from the API's own origin. A cross-origin host never reaches
 * these routes (`SameSite=Strict`), and stays on the bearer path.
 */
export interface IAccountAPI {
    /**
     * What the console hydrates its session from: the same projection
     * `POST /token/introspect` answers with, minus everything token-shaped.
     * A request carrying no (or a dead) cookie answers `{ active: false }`
     * rather than failing.
     */
    getSession() : Promise<OAuth2TokenIntrospectionResponse>;

    /**
     * Sign out: the server drops the credential, revokes the session and
     * clears the cookie.
     */
    deleteSession() : Promise<void>;
}
