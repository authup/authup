/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import process from 'node:process';
import type { IApplication } from 'orkos';

const FORCE_EXIT_TIMEOUT_MS = 10_000;

/**
 * Terminate a long-running application on SIGINT / SIGTERM.
 *
 * The first signal tears the application down and exits with its outcome, a
 * second one exits immediately, and a teardown outlasting the timeout is
 * forced. Every command that keeps a process alive shares this, so a worker
 * answers a container stop exactly like the server does.
 */
export function registerShutdownHandlers(app: IApplication) : void {
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
}
