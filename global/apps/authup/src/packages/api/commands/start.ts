/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import consola from 'consola';
import { ServerCommand } from '../constants';
import { executeServerCommand } from './module';
import type { ApiStartCommandContext } from './type';
import { handleServerCommandOutput } from './utils';

export async function startServer(ctx: ApiStartCommandContext) {
    consola.info('Server: Starting...');
    consola.info(`Server: Port ${ctx.env.PORT}`);

    const childProcess = await executeServerCommand(ServerCommand.START, ctx);
    consola.success('Server: Started');

    handleServerCommandOutput(childProcess);
}
