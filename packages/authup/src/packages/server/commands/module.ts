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
import { ServerCommand } from '../constants';

export async function executeServerCommand(command: `${ServerCommand}`) : Promise<ChildProcess> {
    return new Promise<ChildProcess>((resolve, reject) => {
        const modulePath = resolvePackagePath('@authup/server', process.cwd());
        const directory = path.dirname(modulePath);

        const outputPath = path.join(directory, 'dist', 'cli', 'index.js');
        const childProcess = exec(`node ${outputPath} ${command}`);
        childProcess.on('spawn', () => {
            resolve(childProcess);
        });

        childProcess.stderr.setEncoding('utf-8');
        childProcess.stderr.on('data', (data) => {
            reject(data);
        });
    });
}
