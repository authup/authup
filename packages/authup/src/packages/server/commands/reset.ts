/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import consola from 'consola';
import { ChildProcess } from 'child_process';
import { CommandExecutionContext } from '../../type';
import { ServerCommand } from '../constants';
import { executeServerCommand } from './module';
import { handleServerCommandOutput } from './utils';

export async function resetServer(ctx?: CommandExecutionContext) : Promise<ChildProcess> {
    consola.info('Server: Cleanup configuration, database, ...');
    const childProcess = await executeServerCommand(ServerCommand.RESET, ctx);
    consola.success('Server: Cleaned up');

    handleServerCommandOutput(childProcess);

    return childProcess;
}
