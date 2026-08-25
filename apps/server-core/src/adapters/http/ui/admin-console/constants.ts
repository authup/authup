/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The path segment the admin console is served under: the controller mount,
 * the login cookie scope, the callback URL, the asset mount and the bundle's
 * vite base all derive from it. One spelling, so a move cannot drift the
 * login flow away from the page.
 */
export const ADMIN_CONSOLE_SEGMENT = 'admin';
