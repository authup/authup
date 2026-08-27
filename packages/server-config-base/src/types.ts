/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The configuration keys more than one authup server package reads.
 *
 * They are declared here rather than in each package because no package can
 * import another: server-core reaching into a console service would drag
 * that console's dist into an `authup core` deployment, and a console
 * reaching into server-core would drag native crypto bindings, winston and
 * redis into a static file server. Declaring them per package instead left
 * one copy per reader, and `composeSchemas` can prove two copies AGREE but
 * not that a package remembered to declare a key at all. A key one registry
 * quietly omits is read as its default, in silence.
 *
 * A consumer's own `Config` type extends the subset it reads, and its
 * registry spreads the matching entries out of {@link BASE_CONFIG_SCHEMA}.
 */
export type BaseConfig = {
    /**
     * Externally reachable base URL of the API, and the OIDC issuer.
     *
     * Read by every console as the address it talks to, and derived by
     * server-core from its host and port when the document names none. A
     * console has no host and port of the API's to derive it from, so the
     * CLI hands its resolved value over.
     */
    publicUrl: string,
    /**
     * Trusted first-party app origins besides publicUrl.
     *
     * Read by server-core as the redirect allowlist of every realm's public
     * system clients, and by the account console as the allowlist its `ref`
     * back link is validated against. Entries are canonicalized (a bare host
     * expands to its http and its https origin) by whoever normalizes the
     * configuration, which for the composed CLI is server-core.
     */
    trustedOrigins: string[],
    /**
     * The operator theme directory, read by all three console services.
     * Empty disables theming entirely.
     */
    themeDirectoryPath: string,
    themeFragmentsEnabled: boolean,
    /**
     * Where each console service is served.
     *
     * Read by the console itself (it is the base its router, its asset hrefs
     * and its inter-page links carry) and by server-core (the hosted page
     * GETs redirect to the auth console's, and the server-side login lands
     * the browser on a static console's). Empty derives it from publicUrl.
     */
    authConsoleUrl: string,
    accountConsoleUrl: string,
    adminConsoleUrl: string,
    /**
     * Whether a static console is served at all.
     *
     * Read by the console service (it injects the flag its shell renders the
     * disabled notice from) and by server-core (a console nothing serves
     * must not get a server-side login either).
     */
    accountConsoleEnabled: boolean,
    adminConsoleEnabled: boolean,
};
