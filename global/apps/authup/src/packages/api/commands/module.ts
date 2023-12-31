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
import type { CommandExecutionContext } from '../../../command';
import { AppPackageName } from '../../../constants';
import { getClosestNodeModulesPath, stringifyObjectArgs } from '../../../utils';
import type { ServerCommand } from '../constants';

export function createServerCommand(cmd: string) {
    let base = `npx ${AppPackageName.SERVER_CORE}`;
    const modulePath = findUpPackagePath(AppPackageName.SERVER_CORE, process.cwd()) ||
        findUpPackagePath(AppPackageName.SERVER_CORE, getClosestNodeModulesPath());

    if (typeof modulePath === 'string') {
        const directory = path.dirname(modulePath);
        const outputPath = path.join(directory, 'dist', 'cli', 'index.js');
        base = `node ${outputPath}`;
    }

    return `${base} ${modulePath} ${cmd}`;
}

export async function executeServerCommand(
    command: `${ServerCommand}`,
    ctx?: CommandExecutionContext,
) : Promise<ChildProcess> {
    ctx.env = ctx.env || {};
    ctx.args = ctx.args || {};

    return new Promise<ChildProcess>((resolve, reject) => {
        let base = `npx ${AppPackageName.SERVER_CORE}`;
        const modulePath = findUpPackagePath(AppPackageName.SERVER_CORE, process.cwd()) ||
            findUpPackagePath(AppPackageName.SERVER_CORE, getClosestNodeModulesPath());

        if (typeof modulePath === 'string') {
            const directory = path.dirname(modulePath);
            const outputPath = path.join(directory, 'dist', 'cli', 'index.js');
            base = `node ${outputPath}`;
        }

        const childProcess = exec(`${base} ${command} ${stringifyObjectArgs(ctx.args)}`, {
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
