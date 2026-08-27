/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
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
     * Where the service listens.
     */
    port?: number,
    host?: string,
    /**
     * A substituted console package to render instead of the resolved
     * `@authup/client-auth-console` (the `AUTH_CONSOLE_PATH` seam).
     */
    distPath?: string,
};
