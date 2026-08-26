/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import type { ConfigReadFsOptions } from '../../app/index.ts';
import { createApplication } from '../../app/index.ts';
import { createCLIConfigModule } from './config.ts';
import { registerShutdownHandlers } from './shutdown.ts';

export function defineCLIStartCommand(configFs: ConfigReadFsOptions = {}) {
    return defineCommand({
        meta: { name: 'start' },
        async setup() {
            const app = createApplication({ config: createCLIConfigModule(configFs) });

            await app.setup();

            registerShutdownHandlers(app);
        },
    });
}
