/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import type { ApplicationMountFactory, ConfigReadFsOptions } from '../../app/index.ts';
import { createApplication } from '../../app/index.ts';
import { createCLIConfigModule } from './config.ts';
import { registerShutdownHandlers } from './shutdown.ts';

export type CLIStartCommandOptions = {
    /**
     * Handlers to compose onto the same listener, so one process can serve
     * more than server-core does. The CLI supplies them: server-core is
     * deliberately ignorant of what it mounts (plan 101 D2). Without any,
     * this is the `core` role: the API and the IdP alone.
     */
    mounts?: ApplicationMountFactory,
    /**
     * The name the command reports. Two roles run the same factory and
     * differ only in what they mount, so the operator-facing word is a
     * caller decision.
     */
    name?: string,
};

export function defineCLIStartCommand(
    configFs: ConfigReadFsOptions = {},
    options: CLIStartCommandOptions = {},
) {
    return defineCommand({
        meta: { name: options.name || 'start' },
        async setup() {
            const app = createApplication({
                config: createCLIConfigModule(configFs),
                mounts: options.mounts,
            });

            await app.setup();

            registerShutdownHandlers(app);
        },
    });
}
