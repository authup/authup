/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ChildProcess } from 'node:child_process';
import { exec } from 'node:child_process';
import consola from 'consola';
import path from 'node:path';
import process from 'node:process';
import findUpPackagePath from 'resolve-package-path';
import { getClosestNodeModulesPath, stringifyObjectArgs } from '../../../utils';
import type { CommandExecutionContext } from '../../type';
import type { UICommand } from '../constants';

export function executeUICommand(
    command: `${UICommand}`,
    ctx?: CommandExecutionContext,
) : Promise<ChildProcess> {
    ctx = ctx || {};
    ctx.env = ctx.env || {};
    ctx.args = ctx.args || {};

    return new Promise<ChildProcess>((resolve, reject) => {
        let base = 'npx @authup/ui';
        const modulePath = findUpPackagePath('@authup/ui', process.cwd()) ||
            findUpPackagePath('@authup/ui', getClosestNodeModulesPath());

        if (typeof modulePath === 'string') {
            const directory = path.dirname(modulePath);
            const outputPath = path.join(directory, '.output', 'server', 'index.mjs');
            base = `node ${outputPath}`;
        }

        const childProcess = exec(`${base} ${stringifyObjectArgs(ctx.args)}`, {
            env: {
                PATH: process.env.PATH,
                ...(ctx.envFromProcess ? process.env : {}),
                ...ctx.env,
            } as Record<string, any>,
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
