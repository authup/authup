/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ChildProcess } from 'node:child_process';
import { exec } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import consola from 'consola';
import findUpPackagePath from 'resolve-package-path';
import { getClosestNodeModulesPath, stringifyObjectArgs } from '../../../utils';
import type { CommandExecutionContext } from '../../type';
import type { UICommand } from '../constants';

export function executeUICommand(
    command: `${UICommand}`,
    ctx: CommandExecutionContext = {},
) : Promise<ChildProcess> {
    ctx.env = ctx.env || {};
    ctx.args = ctx.args || {};

    return new Promise<ChildProcess>((resolve, reject) => {
        let base = 'npx @authup/client-ui';
        const modulePath = findUpPackagePath('@authup/client-ui', process.cwd()) ||
            findUpPackagePath('@authup/client-ui', getClosestNodeModulesPath());

        if (typeof modulePath === 'string') {
            const directory = path.dirname(modulePath);
            const outputPath = path.join(directory, '.output', 'server', 'index.mjs');
            base = `node ${outputPath}`;
        }

        const env = {
            PATH: process.env.PATH,
            ...(ctx.envFromProcess ? process.env : {}),
        } as Record<string, any>;

        const keys = Object.keys(ctx.env);
        for (let i = 0; i < keys.length; i++) {
            env[keys[i]] = ctx.env[keys[i]];

            if (!keys[i].match(/^(?:NUXT|NITRO)_.*$/)) {
                env[`NUXT_PUBLIC_${keys[i]}`] = ctx.env[keys[i]];
            }
        }

        const childProcess = exec(`${base} ${stringifyObjectArgs(ctx.args)}`, {
            env,
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
