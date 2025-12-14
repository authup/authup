/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useLogger } from '@authup/server-kit';
import { defineCommand } from 'citty';
import { type ApplicationModuleContext, createApplication } from '../../app';
import { applyConfig, useConfig } from '../../config';
import { DependencyContainer } from '../../core';

export function defineCLIStartCommand() {
    return defineCommand({
        meta: {
            name: 'start',
        },
        async setup() {
            const config = useConfig();
            applyConfig(config);

            const container = new DependencyContainer<ApplicationModuleContext>();
            container.register('config', config);
            container.register('logger', useLogger());
            const app = createApplication(container);

            await app.start();
        },
    });
}
