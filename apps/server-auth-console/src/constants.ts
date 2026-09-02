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
export const VITE_BASE = '/console/auth/';

/**
 * The path the service is served under by default, i.e. the path component
 * of `authConsole.url`. It is the same segment server-core mounted
 * the assets at before the split, so a built bundle needs no rebuild.
 */
export const BASE_PATH = '/console/auth';

/**
 * The pages the service renders. Each is a route of the console bundle's
 * own router, and each is what a server-core page GET now redirects to.
 */
export const PAGES = [
    '/authorize',
    '/register',
    '/activate',
    '/password-forgot',
    '/password-reset',
    '/logout',
] as const;

/**
 * Where this service mounts the bundle's `assets/` directory. The public
 * asset URL is the service's own public path plus this route, which is what
 * the bundle's fixed vite base is rebased onto.
 */
export const ASSETS_PATH = '/assets';

export const HEALTH_PATH = '/healthy';
