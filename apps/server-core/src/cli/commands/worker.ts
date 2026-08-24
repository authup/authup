/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import type { ConfigReadFsOptions } from '../../app/index.ts';
import { createWorkerApplication } from '../../app/index.ts';
import { createCLIConfigModule } from '../config.ts';
import { registerShutdownHandlers } from './shutdown.ts';

export function defineCLIWorkerCommand(configFs: ConfigReadFsOptions = {}) {
    return defineCommand({
        meta: { name: 'worker' },
        async setup() {
            const app = createWorkerApplication({ config: createCLIConfigModule(configFs) });

            await app.setup();

            registerShutdownHandlers(app);
        },
    });
}
