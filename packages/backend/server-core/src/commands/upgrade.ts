/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createConnection } from 'typeorm';
import { UpgradeCommandContext } from './type';
import { buildDatabaseConnectionOptions } from '../database';
import { migrationGenerateCommand } from './migration';
import { useConfig } from '../config';

export async function upgradeCommand(context: UpgradeCommandContext) {
    if (context.spinner) {
        context.spinner.start('Establish database connection.');
    }

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

    if (context.spinner) {
        context.spinner.succeed('Established database connection.');
    }

    try {
        if (context.spinner) {
            context.spinner.start('Execute migrations.');
        }

        await connection.runMigrations({ transaction: 'all' });

        if (context.spinner) {
            context.spinner.succeed('Executed migrations.');
        }

        if (context.migrationsGenerate) {
            await migrationGenerateCommand({
                ...context,
                connection,
            });

            if (context.spinner) {
                context.spinner.start('Execute migrations.');
            }
            await connection.runMigrations({ transaction: 'all' });
            if (context.spinner) {
                context.spinner.succeed('Executed migrations.');
            }
        }
    } finally {
        await connection.close();
    }
}
