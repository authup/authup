/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    AuthConsoleConfig,
    CoreConfig,
    RootConfig,
    SECTION_KEY,
    ThemeConfig,
    ToObjectLiteral,
} from '@authup/server-config';

/**
 * The `authup.yml` NAMESPACE: the sections this service selects keys from.
 *
 * Its OWN section is spread flat, because those keys are already this
 * service's vocabulary; every other section keeps the key the document nests
 * it at. What the two vocabularies do not share stays out: `apiUrl` and
 * `distPath` below are this service's names for values the document calls
 * something else, so they belong to {@link Config} alone.
 */
export type ConfigInput = ToObjectLiteral<
    RootConfig &
    {
        [SECTION_KEY.THEME]: ThemeConfig,
        // only what the publicUrl derivation reads; see the registry
        [SECTION_KEY.CORE]: Pick<CoreConfig, 'host' | 'port'>
    } &
    AuthConsoleConfig
>;

/**
 * The service's own configuration. This console is the primary context here
 * and server-core is the external thing it calls, hence `url` for its own
 * address and `apiUrl` for the API's.
 */
export type Config = {
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

    theme: ThemeConfig
};
