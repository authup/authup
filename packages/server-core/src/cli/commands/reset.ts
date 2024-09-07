/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import process from 'node:process';
import {
    executeResetCommand,
} from '../../commands';
import {
    applyConfig, useConfig,
} from '../../config';

export function defineCLIResetCommand() {
    return defineCommand({
        meta: {
            name: 'reset',
        },
        async setup() {
            const config = useConfig();
            applyConfig(config);

            await executeResetCommand();

            process.exit(0);
        },
    });
}
