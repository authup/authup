/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import process from 'node:process';
import type { ConfigReadFsOptions } from '../../app/index.ts';
import { createApplication } from '../../app/index.ts';
import { createCLIConfigModule } from '../config.ts';

const FORCE_EXIT_TIMEOUT_MS = 10_000;

export function defineCLIStartCommand(configFs: ConfigReadFsOptions = {}) {
    return defineCommand({
        meta: { name: 'start' },
        async setup() {
            const app = createApplication({ config: createCLIConfigModule(configFs) });

            await app.setup();

            let shuttingDown = false;
            const shutdown = async (signal: NodeJS.Signals) => {
                if (shuttingDown) {
                    process.exit(1);
                }
                shuttingDown = true;

                const force = setTimeout(() => {
                    process.stderr.write(`\n${signal} teardown timed out after ${FORCE_EXIT_TIMEOUT_MS}ms — forcing exit.\n`);
                    process.exit(1);
                }, FORCE_EXIT_TIMEOUT_MS);
                force.unref();

                try {
                    await app.teardown();
                    process.exit(0);
                } catch (err) {
                    process.stderr.write(`Error during ${signal} teardown: ${(err as Error).stack ?? String(err)}\n`);
                    process.exit(1);
                }
            };

            process.on('SIGINT', shutdown);
            process.on('SIGTERM', shutdown);
        },
    });
}
