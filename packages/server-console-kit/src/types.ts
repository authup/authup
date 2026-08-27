/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IAppEvent } from 'routup';
import type { IThemeProvider } from './theme/index';

export type UIClientPreferences = {
    locale?: string,
    colorMode?: string,
};

/**
 * The winston-shaped structural logger the console services pass down.
 *
 * Declared here rather than imported from `@authup/server-kit`: that
 * package pulls native bcrypt/jsonwebtoken bindings, winston, redis and
 * the socket.io emitter, and a package that serves static files has no
 * business inheriting any of it. The shape is structural anyway, so a
 * server-kit `Logger` satisfies it.
 */
export type ConsoleLogger = {
    error(message: any, ...meta: any[]): unknown,
    warn(message: any, ...meta: any[]): unknown,
    info(message: any, ...meta: any[]): unknown,
    debug(message: any, ...meta: any[]): unknown,
};

export type StaticConsoleDefinition = {
    /**
     * The npm package whose built `dist/` carries the shell (`index.html`)
     * and its `assets/`. Resolved through the node_modules ancestor walk from
     * the serving package's own root, or from a substituted package path.
     */
    packageName: string,
    /**
     * The `index.html` marker the runtime config script replaces. It is the
     * console's whole runtime contract: without it the injected
     * `window.__AUTHUP__` never lands.
     */
    marker: string,
    /**
     * The fixed vite `base` the bundle was built with (`/console/account/`).
     * Asset hrefs are rebased from it onto the deployment base path per
     * request.
     */
    viteBase: string,
    /**
     * Where the node_modules ancestor walk starts: the serving package's own
     * root. It decides which node_modules tree is searched, so it is a
     * caller decision rather than this package's location.
     */
    cwd: string,
    /**
     * A substituted console package to serve instead of the resolved one,
     * consulted before the walk.
     */
    distPath?: string,
};

export type StaticConsoleServeOptions = {
    /**
     * The path the console is publicly served under. Asset hrefs are rebased
     * onto it and the theme's asset URLs are built from it.
     */
    basePath: string,
    /**
     * The operator theme applied to the rendered shell, if any.
     */
    theme?: IThemeProvider,
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
    readonly viteBase: string,
    /**
     * Locate the built bundle. Only a positive result is cached, so a dev
     * building the app after boot is picked up on the next request.
     */
    resolveDistPath(): string | undefined,
    serve(event: IAppEvent, options: StaticConsoleServeOptions): Promise<string>,
};
