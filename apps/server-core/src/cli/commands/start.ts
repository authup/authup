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
     * deliberately ignorant of what it mounts (plan 101 D2).
     */
    mounts?: ApplicationMountFactory,
};

export function defineCLIStartCommand(
    configFs: ConfigReadFsOptions = {},
    options: CLIStartCommandOptions = {},
) {
    return defineCommand({
        meta: { name: 'start' },
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
