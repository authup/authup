#!/usr/bin/env node
/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { serve } from 'routup/node';
import { AUTH_CONSOLE_BASE_PATH } from './constants';
import { createAuthConsoleServer } from './server';
import type { AuthConsoleConfig } from './types';

/**
 * The standalone entry. It reads the few keys the service needs straight
 * from the environment; the `server.authConsole` section of `authup.yml`
 * and the composed loader arrive with the CLI roles (plan 101 D2-3), which
 * is also when this service stops being started this way in practice.
 */
function readConfig() : AuthConsoleConfig {
    const apiUrl = process.env.API_URL || process.env.PUBLIC_URL;
    if (!apiUrl) {
        throw new Error(
            'The auth console service needs the public URL of server-core. Set API_URL.',
        );
    }

    const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3020;

    return {
        apiUrl,
        url: process.env.AUTH_CONSOLE_URL || `${apiUrl.replace(/\/+$/, '')}${AUTH_CONSOLE_BASE_PATH}`,
        port,
        host: process.env.HOST,
        distPath: process.env.AUTH_CONSOLE_PATH,
    };
}

const config = readConfig();
const app = createAuthConsoleServer(config);

const server = serve(app, {
    port: config.port,
    hostname: config.host,
    silent: true,
});

await server.ready();
