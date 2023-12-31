/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import consola from 'consola';
import type { ChildProcess } from 'node:child_process';
import { exec } from 'node:child_process';
import process from 'node:process';
import { stringifyObjectArgs } from '../utils';
import type { CommandExecutionContext } from './types';

export async function executeCommand(
    ctx: CommandExecutionContext,
) {
    ctx.env = ctx.env || {};
    ctx.args = ctx.args || {};

    return new Promise<ChildProcess>((resolve, reject) => {
        const childProcess = exec(`${ctx.command} ${stringifyObjectArgs(ctx.args)}`, {
            env: {
                PATH: process.env.PATH,
                ...(ctx.envFromProcess ? process.env : {}),
                ...ctx.env,
            },
        });
        childProcess.on('spawn', () => {
            resolve(childProcess);
        });

        childProcess.stderr.setEncoding('utf-8');
        childProcess.stderr.on('data', (data) => {
            consola.warn(data);
            reject(data);
        });
    });
}
