/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    AuthConsoleConfig,
    CONFIG_SECTION_KEY,
    RootConfig,
    ThemeConfig,
    ToObjectLiteral,
} from '@authup/server-config';

/**
 * What this service reads out of `authup.yml` and the environment: the
 * sections it selects keys from, in the CONFIGURATION namespace's own
 * vocabulary.
 *
 * The names are console-qualified because they belong to a document that
 * describes a whole deployment, not to this service. Inside this package that
 * vocabulary reads backwards (`publicUrl` here means the API's URL, not this
 * service's), so it is confined to the configuration layer:
 * `resolveAuthConsoleConfig` maps it onto {@link AuthConsoleConfig} before
 * anything else sees it.
 */
export type AuthConsoleConfigInput = ToObjectLiteral<
    Pick<RootConfig, 'publicUrl'> &
    {
        [CONFIG_SECTION_KEY.THEME]: ThemeConfig
    } &
    AuthConsoleConfig
>;

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

    theme: ThemeConfig
};
