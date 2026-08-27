/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The vite base the auth console bundle is built with. Asset hrefs in the
 * shell are emitted against it, so the service mounts its assets there and
 * rebases them only when the deployment carries a sub-path.
 */
export const AUTH_CONSOLE_VITE_BASE = '/console/auth/';

/**
 * The path the service is served under by default, i.e. the path component
 * of `server.authConsole.url`. It is the same segment server-core mounted
 * the assets at before the split, so a built bundle needs no rebuild.
 */
export const AUTH_CONSOLE_BASE_PATH = '/console/auth';

/**
 * The pages the service renders. Each is a route of the console bundle's
 * own router, and each is what a server-core page GET now redirects to.
 */
export const AUTH_CONSOLE_PAGES = [
    '/authorize',
    '/register',
    '/activate',
    '/password-forgot',
    '/password-reset',
    '/logout',
] as const;

export const HEALTH_PATH = '/healthy';
