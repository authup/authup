/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import process from 'node:process';
import { createApplication } from '../../app';

export function defineCLIResetCommand() {
    return defineCommand({
        meta: {
            name: 'reset',
        },
        async setup() {
            const app = createApplication();
            await app.reset();

            process.exit(0);
        },
    });
}
