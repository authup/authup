/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * One websocket per dev server. Middleware mode cannot share the listener:
 * the console mounts are built inside server-core's `mount` hook, which fires
 * before the http server exists.
 */
export const HMR_PORTS = {
    auth: 24678,
    admin: 24679,
    account: 24680,
} as const;
