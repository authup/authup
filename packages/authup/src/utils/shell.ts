/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ChildProcess } from 'node:child_process';
import { exec } from 'node:child_process';
import process from 'node:process';
import { parseProcessOutputData } from './process-output';
import { stringifyObjectArgs } from './stringify-object-args';

export type ShellCommandExecOptions = {
    configFile?: string,
    configDirectory?: string,

    env?: Record<string, string | undefined>,
    envFromProcess?: boolean,
    args?: Record<string, any>,
    logErrorStream?: (content: string) => void,
    logDataStream?: (content: string) => void
};

export async function execShellCommand(
    command: string,
    ctx: ShellCommandExecOptions = {},
) {
    return new Promise<ChildProcess>((resolve, reject) => {
        const childProcess = exec(`${command} ${stringifyObjectArgs(ctx.args || {})}`, {
            env: {
                PATH: process.env.PATH,
                ...(ctx.envFromProcess ? process.env : {}),
                ...(ctx.env ? ctx.env : {}),
            },
        });

        childProcess.on('error', (data) => {
            reject(data);
        });

        childProcess.on('spawn', () => {
            resolve(childProcess);
        });

        childProcess.stderr.setEncoding('utf-8');
        childProcess.stderr.on('data', (data) => {
            if (typeof data !== 'string' || data.length === 0) {
                return;
            }

            if (ctx.logErrorStream) {
                ctx.logErrorStream(data);
            }
        });

        childProcess.stdout.on('data', (data) => {
            if (typeof data !== 'string' || data.length === 0) {
                return;
            }

            if (!ctx.logDataStream) {
                return;
            }

            const lines = parseProcessOutputData(data);
            for (let i = 0; i < lines.length; i++) {
                ctx.logDataStream(lines[i]);
            }
        });
    });
}
