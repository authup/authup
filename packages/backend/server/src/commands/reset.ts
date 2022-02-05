/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import * as ora from 'ora';
import { dropDatabase } from 'typeorm-extension';
import { buildDatabaseConnectionOptions } from '../database';
import { StartCommandContext } from './type';
import { useConfig } from '../config';

export async function resetCommand(context: StartCommandContext) {
    const spinner = ora.default({
        spinner: 'dots',
    });

    context.config ??= useConfig();

    spinner.start('Executing database reset.');

    const connectionOptions = await buildDatabaseConnectionOptions(context.config, context.databaseConnectionMerge);
    await dropDatabase({ ifExist: true }, connectionOptions);

    spinner.succeed('Executed database reset.');
}
