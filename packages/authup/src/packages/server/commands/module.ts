/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ChildProcess, exec } from 'child_process';
import consola from 'consola';
import path from 'path';
import process from 'process';
import findUpPackagePath from 'resolve-package-path';
import { getClosestNodeModulesPath, stringifyObjectArgs } from '../../../utils';
import { CommandExecutionContext } from '../../type';
import { ServerCommand } from '../constants';

export async function executeServerCommand(
    command: `${ServerCommand}`,
    ctx?: CommandExecutionContext,
) : Promise<ChildProcess> {
    ctx = ctx || {};
    ctx.env = ctx.env || {};
    ctx.args = ctx.args || {};

    return new Promise<ChildProcess>((resolve, reject) => {
        let base = 'npx @authup/server';
        const modulePath = findUpPackagePath('@authup/server', process.cwd()) ||
            findUpPackagePath('@authup/server', getClosestNodeModulesPath());

        if (typeof modulePath === 'string') {
            const directory = path.dirname(modulePath);
            const outputPath = path.join(directory, 'dist', 'cli', 'index.js');
            base = `node ${outputPath}`;
        }

        const childProcess = exec(`${base} ${command} ${stringifyObjectArgs(ctx.args)}`, {
            env: ctx.env,
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
