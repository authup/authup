#!/usr/bin/env node
/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { serve } from 'routup/node';
import { readAdminConsoleConfigFromEnv } from './config';
import { createAdminConsoleServer } from './server';

/**
 * The standalone entry. It reads the keys the service needs from the
 * environment alone; the `server.adminConsole` section of `authup.yml` and
 * the composed loader arrive with the CLI roles (plan 101 D2-3), which is
 * also when this service stops being started this way in practice.
 */
const config = readAdminConsoleConfigFromEnv();
const app = await createAdminConsoleServer(config);

const server = serve(app, {
    port: config.port,
    hostname: config.host || undefined,
    silent: true,
});

await server.ready();
