/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The path segments the served consoles live under. Each is spelled ONCE:
 * the controller mount, the login cookie scope, the callback URL, the asset
 * mount and the shell's rebased vite base all derive from it, so a move
 * cannot drift the login flow away from the page. The vite `base` in each
 * console workspace is a hand-synced literal (a vite config cannot import a
 * server constant); the page specs catch a bundle built against another.
 */
export const ADMIN_CONSOLE_SEGMENT = 'console/admin';

export const ACCOUNT_CONSOLE_SEGMENT = 'console/account';

/**
 * The auth console's namespace, under which ONLY its assets are mounted
 * (`<segment>/assets`, the same shape as the two static consoles). Its
 * PAGES stay on their protocol routes (`/authorize`, `/logout`, the
 * workflow paths), so `/console/auth` itself serves nothing.
 */
export const AUTH_CONSOLE_SEGMENT = 'console/auth';
