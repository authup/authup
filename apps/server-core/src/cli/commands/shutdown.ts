/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IContainer } from 'eldin';
import process from 'node:process';
import { ConfigInjectionKey, HTTPInjectionKey } from '../../app/index.ts';

const FORCE_EXIT_TIMEOUT_MS = 10_000;

export type ShutdownHandlersOptions = {
    /**
     * Runs once, as the first signal arrives and before anything is torn down.
     */
    onSignal?: () => void,
    /**
     * Milliseconds to keep serving between the signal and the teardown.
     * default: 0
     */
    delay?: number,
};

/**
 * Terminate a long-running application on SIGINT / SIGTERM.
 *
 * The first signal tears the application down and exits with its outcome, a
 * second one exits immediately, and a teardown outlasting the timeout is
 * forced. Every command that keeps a process alive shares this, so a worker
 * answers a container stop exactly like the server does.
 *
 * Typed structurally rather than against orkos' `IApplication`: a console
 * role owns listeners rather than a module graph, and teardown is the whole
 * of what this needs.
 *
 * `onSignal` runs as the first signal arrives and `delay` (milliseconds)
 * holds the teardown back afterwards: the listener keeps serving while its
 * readiness route already answers 503, so a load balancer stops routing
 * here before the socket closes. The force timeout starts after the delay.
 */
export function registerShutdownHandlers(
    app: { teardown(): Promise<unknown> },
    options: ShutdownHandlersOptions = {},
) : void {
    let shuttingDown = false;
    const shutdown = async (signal: NodeJS.Signals) => {
        if (shuttingDown) {
            process.exit(1);
        }

        shuttingDown = true;

        if (options.onSignal) {
            options.onSignal();
        }

        if (options.delay && options.delay > 0) {
            await new Promise<void>((resolve) => {
                setTimeout(resolve, options.delay);
            });
        }

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

/**
 * The drain of an application serving the API: the signal flips its
 * readiness route to 503 and `core.shutdownDelay` holds the teardown back.
 */
export function buildShutdownHandlersOptions(container: IContainer) : ShutdownHandlersOptions {
    const config = container.resolve(ConfigInjectionKey);
    const state = container.tryResolve(HTTPInjectionKey.ShutdownState);

    return {
        delay: config.shutdownDelay * 1_000,
        onSignal: () => {
            if (state.success) {
                state.data.active = true;
            }
        },
    };
}
