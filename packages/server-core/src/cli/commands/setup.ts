/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import process from 'node:process';
import { executeSetupCommand } from '../../commands';
import {
    applyConfig, useConfig,
} from '../../config';

export function defineCLISetupCommand() {
    return defineCommand({
        meta: {
            name: 'setup',
        },
        async setup() {
            const config = useConfig();
            applyConfig(config);

            await executeSetupCommand();

            process.exit(0);
        },
    });
}
