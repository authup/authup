/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConsoleApplication } from '@authup/server-console-kit';
import { defineConsoleApplication } from '@authup/server-console-kit';
import { createAdminConsoleHandler } from './handler';
import type { Config } from './types';

/**
 * This console as a runnable service: its own listener, its own lifecycle,
 * nothing of server-core's. It is what `authup console` starts and what the
 * `authup-admin-console` bin starts, so the two paths cannot diverge.
 */
export function createAdminConsoleApplication(config: Config) : ConsoleApplication {
    return defineConsoleApplication({
        name: 'admin console',
        port: config.port,
        host: config.host,
        createHandler: () => createAdminConsoleHandler(config),
    });
}
