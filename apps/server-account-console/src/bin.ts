#!/usr/bin/env node
/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildShutdownOptions } from '@authup/server-console-kit';
import process from 'node:process';
import { createApplication } from './application';

/**
 * The standalone entry: the same application `authup start console account`
 * starts, configured from the environment alone. The `accountConsole` section
 * of `authup.yml` reaches this service through the CLI roles (plan 101 D2-3),
 * which is also how it is started in practice.
 */
const application = createApplication();

await application.setup();

const { delay, onSignal } = buildShutdownOptions([application]);

const shutdown = () => {
    // `GET /readyz` answers 503 from here on; the listener keeps serving
    // for `shutdownDelay`, so a load balancer stops routing here first.
    onSignal();

    setTimeout(() => {
        application.teardown()
            .then(() => process.exit(0), () => process.exit(1));
    }, delay);
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
