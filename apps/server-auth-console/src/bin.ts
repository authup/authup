#!/usr/bin/env node
/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import process from 'node:process';
import { createApplication } from './application';

/**
 * The standalone entry: the same application `authup start console auth`
 * starts, configured from the environment alone. `authup.yml` reaches this
 * service through the CLI roles, which hand each factory its own section, and
 * that is also how it is started in practice.
 */
const application = createApplication();
await application.setup();

const shutdown = () => application.teardown()
    .then(() => process.exit(0), () => process.exit(1));
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
