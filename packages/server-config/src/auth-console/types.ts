/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The `server.authConsole.*` section.
 *
 * The field names carry the console prefix the CONFIGURATION key carries,
 * while the document path drops it (`authConsoleUrl` reads
 * `server.authConsole.url`). The section is per CONSOLE, never per
 * implementation package, so substituting the package leaves the document
 * untouched.
 *
 * `Section` distinguishes it from `AuthConsoleConfig`, the service's own
 * vocabulary, which is what everything inside that package reads.
 */
export type AuthConsoleSectionConfig = {
    /**
     * Where the auth console service is served, e.g.
     * `https://example.com/console/auth`.
     *
     * Read by the console itself (it is the base its router, its asset hrefs
     * and its inter-page links carry) and by server-core, whose hosted login,
     * consent and workflow page GETs redirect there. Empty derives it from
     * publicUrl, which is the single-origin default.
     */
    authConsoleUrl: string,

    /**
     * A substituted console package to render instead of the resolved
     * `@authup/client-auth-console`. Empty resolves the package through the
     * node_modules walk.
     */
    authConsolePath: string,

    /**
     * Where the standalone service listens. Unrelated to the url above:
     * behind a reverse proxy the two always differ.
     */
    authConsolePort: number,
    authConsoleHost: string,
};
