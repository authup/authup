/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The `authup.yml` NAMESPACE: one field per registry key, spelled exactly as
 * the key is spelled there.
 *
 * The names are console-qualified because a key several packages read has to
 * be spelled the same in every registry declaring it, which is what lets
 * `composeSchemas` assert the declarations agree on path, environment
 * variable and default. Inside this package that vocabulary reads backwards
 * (`publicUrl` here means the API's URL, not this service's), so it is
 * confined to the configuration layer and mapped onto
 * {@link AdminConsoleConfig} before anything else sees it.
 */
export type AdminConsoleConfigInput = {
    publicUrl: string,
    adminConsoleUrl: string,
    adminConsoleEnabled: boolean,
    adminConsolePath: string,
    adminConsolePort: number,
    adminConsoleHost: string,
    themeDirectoryPath: string,
    themeFragmentsEnabled: boolean,
};

/**
 * The service's own vocabulary, which is what every consumer in this package
 * reads.
 */
export type AdminConsoleConfig = {
    /**
     * This console's own public URL, e.g. `https://example.com/console/admin`.
     * Its path component is the base every asset href and the injected
     * `basePath` carry, and the base the theme's asset URLs are built from.
     */
    url: string,
    /**
     * The public URL of server-core. The address the VISITOR reaches, never
     * an internal one: the console derives its HTTP client and its cookie
     * path from it.
     */
    apiUrl: string,
    /**
     * Serve the console at all. Off, the shell still answers, and the SPA
     * renders the disabled notice from the injected feature flag.
     */
    enabled: boolean,
    /**
     * Where the standalone service listens. Unrelated to
     * {@link AdminConsoleConfig.url}: behind a reverse proxy the two always
     * differ.
     */
    port: number,
    host: string,
    /**
     * A substituted console package to serve instead of the resolved
     * `@authup/client-admin-console`. Empty resolves the package through the
     * node_modules walk.
     */
    distPath: string,
    /**
     * The operator theme directory. Empty disables theming entirely: no
     * provider is created and no route is mounted.
     */
    themeDirectoryPath: string,
    /**
     * Opt in to splicing `fragments/head.html` from the theme directory into
     * the served shell.
     */
    themeFragmentsEnabled: boolean,
};
