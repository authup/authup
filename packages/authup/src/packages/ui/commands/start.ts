/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import consola from 'consola';
import type { ChildProcess } from 'child_process';
import { parseProcessOutputData } from '../../../utils';
import { UICommand } from '../constants';
import { executeUICommand } from './module';
import type { UIStartCommandContext } from './type';

export async function startUI(ctx: UIStartCommandContext) : Promise<ChildProcess> {
    consola.info('UI: Starting...');
    consola.info(`UI: Port ${ctx.env.NUXT_PORT}`);

    const childProcess = await executeUICommand(UICommand.START, ctx);
    consola.success('UI: Started');
    childProcess.stdout.on('data', (data) => {
        if (typeof data !== 'string' || data.length === 0) {
            return;
        }

        const lines = parseProcessOutputData(data);
        for (let i = 0; i < lines.length; i++) {
            consola.info(`UI: ${lines[i]}`);
        }
    });

    return childProcess;
}
