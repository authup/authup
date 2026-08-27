/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The `server.adminConsole.*` section.
 *
 * The field names carry the console prefix the CONFIGURATION key carries,
 * while the document path drops it (`adminConsoleEnabled` reads
 * `server.adminConsole.enabled`). The section is per CONSOLE, never per
 * implementation package, so substituting the package leaves the document
 * untouched.
 *
 * `Section` distinguishes it from `AdminConsoleConfig`, the service's own
 * vocabulary, which is what everything inside that package reads.
 */
export type AdminConsoleSectionConfig = {
    /**
     * Where the admin console service is served, e.g.
     * `https://example.com/console/admin`.
     *
     * Read by the console itself (it is the base its router, its asset hrefs
     * and its inter-page links carry) and by server-core, whose server-side
     * login lands the browser there once the session credential is issued.
     * Empty derives it from publicUrl, which is the single-origin default.
     */
    adminConsoleUrl: string,

    /**
     * Whether the console is served at all.
     *
     * Read by the console service (it injects the flag its shell renders the
     * disabled notice from) and by server-core (a console nothing serves must
     * not get a server-side login either).
     */
    adminConsoleEnabled: boolean,

    /**
     * A substituted console package to serve instead of the resolved
     * `@authup/client-admin-console`. Empty resolves the package through the
     * node_modules walk.
     */
    adminConsolePath: string,

    /**
     * Where the standalone service listens. Unrelated to the url above:
     * behind a reverse proxy the two always differ.
     */
    adminConsolePort: number,
    adminConsoleHost: string,
};
