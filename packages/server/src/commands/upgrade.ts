/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createConnection } from 'typeorm';
import * as ora from 'ora';
import { UpgradeCommandContext } from './type';
import { buildDatabaseConnectionOptions } from '../database';
import { migrationGenerateCommand } from './migration';
import { useConfig } from '../config';

export async function upgradeCommand(context: UpgradeCommandContext) {
    const spinner = ora.default({
        spinner: 'dots',
    });

    spinner.start('Establish database connection.');

    context.config ??= useConfig();

    const connectionOptions = await buildDatabaseConnectionOptions(context.config, context.databaseConnectionMerge);

    Object.assign(connectionOptions, {
        subscribers: [],
        synchronize: false,
        migrationsRun: false,
        dropSchema: false,
        logging: [],
    });

    const connection = await createConnection(connectionOptions);

    spinner.succeed('Established database connection.');

    try {
        spinner.start('Execute migrations.');
        await connection.runMigrations({ transaction: 'all' });
        spinner.succeed('Executed migrations.');

        if (context.migrationsGenerate) {
            await migrationGenerateCommand({
                ...context,
                connection,
            });

            spinner.start('Execute migrations.');
            await connection.runMigrations({ transaction: 'all' });
            spinner.succeed('Executed migrations.');
        }
    } finally {
        await connection.close();
    }
}
