/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Per-child listen defaults.
 *
 * The supervisor ALWAYS emits PORT/HOST for every child, falling back to these
 * values when the config file names none. Children inherit the launcher's
 * environment, so an ambient PORT (a PaaS injects one; the project Dockerfile
 * sets PORT=3000) would otherwise reach both children and make the second one
 * die with EADDRINUSE.
 */
export const SERVER_CORE_PORT_DEFAULT = 3001;

export const CLIENT_ADMIN_CONSOLE_PORT_DEFAULT = 3000;

export const LISTEN_HOST_DEFAULT = '0.0.0.0';
