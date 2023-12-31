/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ChildProcess } from 'node:child_process';
import consola from 'consola';
import { parseProcessOutputData } from '../../../utils';

export function logChildProcessOutput(childProcess: ChildProcess) {
    childProcess.stdout.on('data', (data) => {
        if (typeof data !== 'string' || data.length === 0) {
            return;
        }

        const lines = parseProcessOutputData(data);
        for (let i = 0; i < lines.length; i++) {
            consola.info(`Server: ${lines[i]}`);
        }
    });
}
