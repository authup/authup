/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ChildProcess, exec } from 'child_process';
import path from 'path';
import process from 'process';
import resolvePackagePath from 'resolve-package-path';
import { UICommand } from '../constants';

type UICommandContext = {
    env?: Record<string, any>
};
export function executeUICommand(command: `${UICommand}`, ctx?: UICommandContext) : Promise<ChildProcess> {
    ctx = ctx || {};

    return new Promise<ChildProcess>((resolve, reject) => {
        const modulePath = resolvePackagePath('@authup/ui', process.cwd());
        const directory = path.dirname(modulePath);

        const outputPath = path.join(directory, '.output', 'server', 'index.mjs');
        const childProcess = exec(`node ${outputPath}`, {
            env: {
                ...process.env,
                ...(ctx.env || {}),
            } as Record<string, any>,
        });
        childProcess.on('spawn', () => {
            resolve(childProcess);
        });

        childProcess.stderr.setEncoding('utf-8');
        childProcess.stderr.on('data', (data) => {
            reject(data);
        });
    });
}
