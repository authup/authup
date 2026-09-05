/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The path segments the two cookie-mode consoles live under. Each is spelled
 * ONCE: the controller mount, the login cookie scope and the callback URL all
 * derive from it, so a move cannot drift the login flow away from the page.
 * The vite `base` in each console workspace is a hand-synced literal (a vite
 * config cannot import a server constant); the console service's handler
 * spec catches a bundle built against another.
 */
export const ADMIN_CONSOLE_SEGMENT = 'console/admin';

export const ACCOUNT_CONSOLE_SEGMENT = 'console/account';
