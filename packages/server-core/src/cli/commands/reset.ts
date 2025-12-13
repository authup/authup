/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useLogger } from '@authup/server-kit';
import { defineCommand } from 'citty';
import process from 'node:process';
import {
    applyConfig, useConfig,
} from '../../config';
import { ModuleContextContainer, createApplication } from '../../app';

export function defineCLIResetCommand() {
    return defineCommand({
        meta: {
            name: 'reset',
        },
        async setup() {
            const config = useConfig();
            applyConfig(config);

            const container = new ModuleContextContainer();
            container.register('config', config);
            container.register('logger', useLogger());

            const app = createApplication(container);
            await app.reset();

            process.exit(0);
        },
    });
}
