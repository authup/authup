/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IAppEvent } from 'routup';
import type { IThemeProvider } from './theme/index.ts';

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
     * config global never lands.
     */
    marker: string,
    /**
     * The window global the runtime config is injected as. Defaults to
     * `__AUTHUP__`; a console with a config of its own names its own, so
     * two consoles on one page keep theirs apart. Must be a JavaScript
     * identifier: it is spliced into an inline script.
     */
    globalName?: string,
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
    /**
     * Where the shell comes from, replacing the read of `<dist>/index.html`.
     * Everything after the read is unchanged, which is what lets a caller
     * serving the console from source keep the config splice, the theme and
     * the page headers.
     */
    readShell?: (event: IAppEvent) => Promise<string>,
};

export type StaticConsoleServeOptions = {
    /**
     * The path the console is publicly served under. The theme's own asset
     * URLs are built from it, so it is where the theme route is mounted.
     */
    basePath: string,
    /**
     * What the bundle's fixed vite base is replaced with in every asset
     * reference: the public path the bundle's own `assets/` directory hangs
     * off, with a trailing slash. A console service mounting them at its own
     * `/assets` passes its base path; a server mounting them AT the vite base
     * passes that. Only the caller knows which it did.
     */
    assetBasePath: string,
    /**
     * The operator theme applied to the rendered shell, if any.
     */
    theme?: IThemeProvider,
    /**
     * The runtime configuration injected as the definition's global, built
     * by the caller: what a console needs is its own business (the account
     * console adds a request-reflected `ref`, for one).
     */
    config: Record<string, unknown>,
    /**
     * Send a restrictive content security policy for the shell instead of
     * the framing-only default: scripts from the own origin plus the
     * injected config script by hash, requests and form posts to the own
     * origin plus `origins`. Only for a shell whose sole inline script is
     * the injected one; anything else inline is refused by the browser.
     * Built once with `defineStaticConsoleCSP`, which validates the origins.
     */
    csp?: StaticConsoleCSP,
};

export type StaticConsoleCSPOptions = {
    /**
     * Origins the console calls or submits forms to besides its own, such
     * as the API's. A source expression each: no whitespace, `;`, `,` or
     * quotes.
     */
    origins?: string[],
};

/**
 * A validated shell policy, built by `defineStaticConsoleCSP`.
 */
export type StaticConsoleCSP = {
    /** The source list of `connect-src` and `form-action`. */
    readonly sources: string,
};

export type StaticConsole = {
    readonly packageName: string,
    readonly marker: string,
    readonly viteBase: string,
    readonly globalName: string,
    /**
     * Locate the console PACKAGE, whether or not it holds a built bundle.
     * A caller serving it from source needs the package root, and must not
     * re-walk for it: the anchor rule is this package's business.
     */
    resolvePackagePath(): string | undefined,
    /**
     * Locate the built bundle. Only a positive result is cached, so a dev
     * building the app after boot is picked up on the next request.
     */
    resolveDistPath(): string | undefined,
    serve(event: IAppEvent, options: StaticConsoleServeOptions): Promise<string>,
};

/**
 * Set once the process received its termination signal; the readiness route
 * reads it.
 */
export type ShutdownState = {
    active: boolean,
};
