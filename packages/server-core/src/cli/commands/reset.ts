/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import process from 'node:process';
import {
    applyConfig, useConfig,
} from '../../config';
import { Application } from '../../module';

export function defineCLIResetCommand() {
    return defineCommand({
        meta: {
            name: 'reset',
        },
        async setup() {
            const config = useConfig();
            applyConfig(config);

            const app = new Application(config);
            await app.reset();

            process.exit(0);
        },
    });
}
