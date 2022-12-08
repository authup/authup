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
import { stringifyObjectArgs } from '../../../utils';
import { CommandExecutionContext } from '../../type';
import { UICommand } from '../constants';

export function executeUICommand(
    command: `${UICommand}`,
    ctx?: CommandExecutionContext,
) : Promise<ChildProcess> {
    ctx = ctx || {};
    ctx.env = ctx.env || {};
    ctx.args = ctx.args || {};

    return new Promise<ChildProcess>((resolve, reject) => {
        let base = 'npx authup-ui';
        const modulePath = findUpPackagePath('@authup/ui', process.cwd());
        if (typeof modulePath === 'string') {
            const directory = path.dirname(modulePath);
            const outputPath = path.join(directory, '.output', 'server', 'index.mjs');
            base = `node ${outputPath}`;
        }

        const childProcess = exec(`${base} ${stringifyObjectArgs(ctx.args)}`, {
            env: {
                ...process.env,
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
