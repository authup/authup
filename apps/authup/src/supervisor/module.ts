/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import consola from 'consola';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import process from 'node:process';
import type { SupervisedChildSpec } from './types';

const FORCE_KILL_TIMEOUT_MS = 10_000;

type RunningChild = {
    spec: SupervisedChildSpec,
    handle: ChildProcess,
    exited: boolean,
};

export async function superviseProcesses(specs: SupervisedChildSpec[]) : Promise<number> {
    if (specs.length === 0) {
        return 0;
    }

    const children : RunningChild[] = [];
    let shutdownSignal : NodeJS.Signals | undefined;
    let terminating = false;
    let firstExitCode : number | undefined;
    let forceKillTimeout : NodeJS.Timeout | undefined;

    const aliveChildren = () => children.filter((child) => !child.exited);

    const scheduleForceKill = () => {
        if (forceKillTimeout) {
            return;
        }

        forceKillTimeout = setTimeout(() => {
            for (const child of aliveChildren()) {
                consola.warn(`${child.spec.id}: did not exit within ${FORCE_KILL_TIMEOUT_MS}ms, sending SIGKILL.`);
                child.handle.kill('SIGKILL');
            }
        }, FORCE_KILL_TIMEOUT_MS);
        forceKillTimeout.unref();
    };

    const terminateSiblings = () => {
        terminating = true;

        const alive = aliveChildren();
        if (alive.length === 0) {
            return;
        }

        for (const child of alive) {
            child.handle.kill('SIGTERM');
        }

        scheduleForceKill();
    };

    const exitPromises : Promise<void>[] = [];

    for (const spec of specs) {
        const handle = spawn(spec.exec, spec.args, {
            stdio: 'inherit',
            env: {
                ...process.env,
                ...spec.env,
            },
        });

        const child : RunningChild = {
            spec, 
            handle, 
            exited: false, 
        };
        children.push(child);

        exitPromises.push(new Promise<void>((resolve) => {
            const settle = (code: number) => {
                if (child.exited) {
                    return;
                }

                child.exited = true;

                if (typeof firstExitCode === 'undefined') {
                    firstExitCode = code;
                }

                if (!shutdownSignal && !terminating) {
                    if (aliveChildren().length > 0) {
                        consola.info(`${spec.id}: exited (code ${code}) - stopping remaining packages.`);
                    }

                    terminateSiblings();
                }

                resolve();
            };

            handle.on('error', (error) => {
                consola.error(`${spec.id}: failed to spawn (${error.message}).`);
                settle(1);
            });

            handle.on('exit', (code, signal) => {
                if (code !== null) {
                    settle(code);
                    return;
                }

                if (signal && (shutdownSignal || terminating)) {
                    settle(0);
                    return;
                }

                settle(1);
            });
        }));
    }

    const onSignal = (signal: NodeJS.Signals) => {
        shutdownSignal = signal;

        for (const child of aliveChildren()) {
            child.handle.kill(signal);
        }

        scheduleForceKill();
    };

    process.on('SIGINT', onSignal);
    process.on('SIGTERM', onSignal);

    try {
        await Promise.all(exitPromises);
    } finally {
        process.off('SIGINT', onSignal);
        process.off('SIGTERM', onSignal);

        if (forceKillTimeout) {
            clearTimeout(forceKillTimeout);
        }
    }

    if (shutdownSignal) {
        return 0;
    }

    return firstExitCode ?? 0;
}
