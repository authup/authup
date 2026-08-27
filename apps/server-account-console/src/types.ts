/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    AccountConsoleSectionConfig,
    RootConfig,
    ThemeConfig,
} from '@authup/server-config';

/**
 * The `authup.yml` NAMESPACE: the sections this service selects keys from.
 *
 * The names are console-qualified because they belong to a document that
 * describes a whole deployment, not to this service. Inside this package that
 * vocabulary reads backwards (`publicUrl` here means the API's URL, not this
 * service's), so it is confined to the configuration layer and mapped onto
 * {@link AccountConsoleConfig} before anything else sees it.
 */
export type AccountConsoleConfigInput = Pick<RootConfig, 'publicUrl' | 'trustedOrigins'> &
    ThemeConfig &
    AccountConsoleSectionConfig;

/**
 * The service's own vocabulary, which is what every consumer in this package
 * reads.
 */
export type AccountConsoleConfig = {
    /**
     * This console's own public URL, e.g.
     * `https://example.com/console/account`. Its path component is the base
     * every asset href and the injected `basePath` carry, and the base the
     * theme's asset URLs are built from.
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
     * {@link AccountConsoleConfig.url}: behind a reverse proxy the two always
     * differ.
     */
    port: number,
    host: string,
    /**
     * A substituted console package to serve instead of the resolved
     * `@authup/client-account-console`. Empty resolves the package through
     * the node_modules walk.
     */
    distPath: string,
    /**
     * Trusted first-party app origins besides the API's own. The allowlist
     * the `ref` back-link parameter is validated against. Entries are
     * canonical http(s) origins.
     */
    trustedOrigins: string[],
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
