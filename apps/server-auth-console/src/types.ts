/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * What this service reads out of `authup.yml` and the environment: one field
 * per registry key, spelled the way the CONFIGURATION namespace spells it.
 *
 * The names are qualified because a key two packages both read has to be
 * declared identically in both registries, which is what lets the composer
 * assert the two declarations agree without either package depending on the
 * other. That namespace is not this service's own vocabulary, so nothing
 * outside `config.ts` sees this shape: `resolveAuthConsoleConfig` maps it
 * onto {@link AuthConsoleConfig}.
 */
export type AuthConsoleConfigInput = {
    /**
     * Server-core's public URL, the deployment-wide `publicUrl` key. It is
     * the API this service talks to, so it becomes `apiUrl` below.
     */
    publicUrl: string,
    authConsoleUrl: string,
    authConsolePath: string,
    authConsolePort: number,
    authConsoleHost: string,
    themeDirectoryPath: string,
    themeFragmentsEnabled: boolean,
};

/**
 * The service's own configuration. This console is the primary context here
 * and server-core is the external thing it calls, hence `url` for its own
 * address and `apiUrl` for the API's.
 */
export type AuthConsoleConfig = {
    /**
     * The public URL this service is reachable at, e.g.
     * `https://example.com/console/auth`. Its path component becomes the
     * console router's base and the prefix every inter-page href carries.
     */
    url: string,
    /**
     * The public URL of server-core, e.g. `https://example.com`. It is what
     * the rendered page talks to, so it must be the address the VISITOR can
     * reach, not an internal one: it becomes the hydration payload's
     * `baseURL`, from which the console derives its HTTP client and its
     * cookie path.
     */
    apiUrl: string,
    /**
     * Where the standalone service listens. Unrelated to `url`: behind a
     * reverse proxy the two always differ.
     */
    port: number,
    host: string,
    /**
     * A substituted console package to render instead of the resolved
     * `@authup/client-auth-console` (the `AUTH_CONSOLE_PATH` seam).
     */
    distPath: string,
    /**
     * The operator theme directory, applied to the rendered pages. An empty
     * value disables theming and creates no provider at all.
     */
    themeDirectoryPath: string,
    themeFragmentsEnabled: boolean,
};
