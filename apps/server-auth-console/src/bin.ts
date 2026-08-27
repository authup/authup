#!/usr/bin/env node
/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { serve } from 'routup/node';
import { readAuthConsoleConfigFromEnv } from './config';
import { createAuthConsoleServer } from './server';

/**
 * The standalone entry. It reads the keys this service declares from the
 * environment; `authup.yml` reaches the service through the CLI roles
 * (`authup console auth`), which hand each factory its own section, and that
 * is also how it is started in practice.
 */
const config = readAuthConsoleConfigFromEnv();
const app = await createAuthConsoleServer(config);

const server = serve(app, {
    port: config.port,
    hostname: config.host,
    silent: true,
});

await server.ready();
