/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The vite base the account console bundle is built with. Asset hrefs in the
 * shell are emitted against it, so the service rewrites them onto the path
 * it actually serves them under.
 */
export const VITE_BASE = '/console/account/';

/**
 * The path the service is served under by default, i.e. the path component
 * of `server.accountConsole.url`. It is the same segment server-core mounted
 * the console at before the split, so a built bundle needs no rebuild.
 */
export const BASE_PATH = '/console/account';

export const PACKAGE_NAME = '@authup/client-account-console';

/**
 * The marker in the built `index.html` the runtime configuration script
 * replaces. It is the console's whole runtime contract: without it the
 * injected `window.__AUTHUP__` never lands and the SPA silently degrades to
 * deriving its API url from its own origin.
 */
export const CONFIG_MARKER = '<!--account-config-->';

export const HEALTH_PATH = '/healthy';
