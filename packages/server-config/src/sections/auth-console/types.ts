/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The `server.authConsole.*` section.
 *
 * The field names are the section's own, the ones the document spells under
 * `server.authConsole.*`, so the console service reads them unchanged. The
 * section is per CONSOLE, never per implementation package, so substituting
 * the package leaves the document untouched.
 *
 * `Section` distinguishes it from `AuthConsoleConfig`, the service's own
 * vocabulary, which carries what the section cannot say (the API's url, the
 * resolved dist path).
 */
export type AuthConsoleConfig = {
    /**
     * Where the auth console service is served, e.g.
     * `https://example.com/console/auth`.
     *
     * Read by the console itself (it is the base its router, its asset hrefs
     * and its inter-page links carry) and by server-core, whose hosted login,
     * consent and workflow page GETs redirect there. Empty derives it from
     * publicUrl, which is the single-origin default.
     */
    url: string,

    /**
     * A substituted console package to render instead of the resolved
     * `@authup/client-auth-console`. Empty resolves the package through the
     * node_modules walk.
     */
    path: string,

    /**
     * Where the standalone service listens. Unrelated to the url above:
     * behind a reverse proxy the two always differ.
     */
    port: number,
    host: string,
};
