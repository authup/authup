/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import process from 'node:process';
import { ApplicationBuilder } from '../../app/index.ts';

export function defineCLIResetCommand() {
    return defineCommand({
        meta: {
            name: 'reset',
        },
        async setup() {
            const app = new ApplicationBuilder()
                .withConfig()
                .withLogger()
                .withDatabase()
                .build();

            await app.setup();
            await app.teardown();

            process.exit(0);
        },
    });
}
