/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IAppEvent } from 'routup';

export type StaticConsoleDefinition = {
    /**
     * The npm package whose built `dist/` carries the shell (`index.html`)
     * and its `assets/`. Resolved through the node_modules ancestor walk from
     * server-core's own package root, or from a substituted package path.
     */
    packageName: string,
    /**
     * The `index.html` marker the runtime config script replaces. It is the
     * console's whole runtime contract: without it the injected
     * `window.__AUTHUP__` never lands.
     */
    marker: string,
    /**
     * The fixed vite `base` the bundle was built with (`/account/`). Asset
     * hrefs are rebased from it onto the deployment base path per request.
     */
    viteBase: string,
};

export type StaticConsoleServeOptions = {
    baseURL: string,
    /**
     * The runtime configuration injected as `window.__AUTHUP__`, built by the
     * caller: what a console needs is its own business (the account console
     * adds a request-reflected `ref`, for one).
     */
    config: Record<string, unknown>,
};

export type StaticConsole = {
    readonly packageName: string,
    readonly marker: string,
    /**
     * Point the resolution at a substituted package instead of the
     * node_modules walk. Called once at boot.
     */
    setPackagePath(value: string | undefined): void,
    /**
     * Locate the built bundle. Only a positive result is cached, so a dev
     * building the app after boot is picked up on the next request.
     */
    resolveDistPath(): string | undefined,
    serve(event: IAppEvent, options: StaticConsoleServeOptions): Promise<string>,
};
