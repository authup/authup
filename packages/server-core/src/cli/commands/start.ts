/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import { applyConfig, useConfig } from '../../config';
import { Application } from '../../module';

export function defineCLIStartCommand() {
    return defineCommand({
        meta: {
            name: 'start',
        },
        async setup() {
            const config = useConfig();
            applyConfig(config);

            const app = new Application(config);
            await app.start();
        },
    });
}
