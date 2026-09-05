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
import type { IThemeProvider } from '@authup/server-console-kit';
import type { IAppEvent } from 'routup';

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
     * Where THIS PROCESS reaches server-core: the document's `internalUrl`.
     * This is the one console that renders server-side, so the two addresses
     * are different questions, and a container port mapping is enough to make
     * them different answers: published as `-p 3001:3000`, `apiUrl` names a
     * port nothing listens on inside the container and every hosted page
     * answers 502 (#3550). On a cluster network it is the service DNS name,
     * so the render never leaves for the ingress and back.
     *
     * Defaults to {@link apiUrl}, which is right whenever the deployment
     * answers at one address from both sides. The composed `authup start`
     * overrides it with its own listen address unless the document named one,
     * the same self-call rule server-core's internal client follows.
     */
    apiInternalUrl: string,
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

/**
 * How a page becomes a document. The default is this service's own
 * `createRenderPage`, reading the built bundle; a caller serving the console
 * from source substitutes one that reads through a vite dev server instead.
 */
export type RenderPage = (
    event: IAppEvent,
    config: Config,
    ctx: {
        url: string,
        data: Record<string, any>,
        theme?: IThemeProvider,
    },
) => Promise<string>;
