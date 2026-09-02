/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The `accountConsole.*` section.
 *
 * The field names are the section's own, exactly as the document spells
 * them under `accountConsole.*`, so the console service reads them
 * unchanged. The section is per CONSOLE, never per implementation package,
 * so substituting the package leaves the document untouched.
 *
 * `Section` distinguishes it from `AccountConsoleConfig`, the service's own
 * vocabulary, which carries what the section cannot say (the API's url,
 * the resolved dist path).
 */
export type AccountConsoleConfig = {
    /**
     * Where the account console service is served, e.g.
     * `https://example.com/console/account`.
     *
     * Read by the console itself (it is the base its router, its asset hrefs
     * and its inter-page links carry) and by server-core, whose server-side
     * login lands the browser there once the session credential is issued.
     * Empty derives it from publicUrl, which is the single-origin default.
     */
    url: string,

    /**
     * Whether the console is served at all.
     *
     * Read by the console service (it injects the flag its shell renders the
     * disabled notice from) and by server-core (a console nothing serves must
     * not get a server-side login either).
     */
    enabled: boolean,

    /**
     * A substituted console package to serve instead of the resolved
     * `@authup/client-account-console`. Empty resolves the package through
     * the node_modules walk.
     */
    path: string,

    /**
     * Where the standalone service listens. Unrelated to the url above:
     * behind a reverse proxy the two always differ.
     */
    port: number,

    host: string,
};
