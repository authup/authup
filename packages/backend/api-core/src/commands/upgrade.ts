/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DataSource } from 'typeorm';
import { UpgradeCommandContext } from './type';
import { buildDataSourceOptions } from '../database';
import { migrationGenerateCommand } from './migration';
import { useConfig } from '../config';

export async function upgradeCommand(context: UpgradeCommandContext) {
    if (context.spinner) {
        context.spinner.start('Establish database connection.');
    }

    context.config ??= useConfig();

    const options = await buildDataSourceOptions(context.config, context.databaseConnectionMerge);

    Object.assign(options, {
        subscribers: [],
        synchronize: false,
        migrationsRun: false,
        dropSchema: false,
        logging: [],
    });

    const dataSource = new DataSource(options);
    await dataSource.initialize();

    if (context.spinner) {
        context.spinner.succeed('Established database connection.');
    }

    try {
        if (context.spinner) {
            context.spinner.start('Execute migrations.');
        }

        await dataSource.runMigrations({ transaction: 'all' });

        if (context.spinner) {
            context.spinner.succeed('Executed migrations.');
        }

        if (context.migrationsGenerate) {
            await migrationGenerateCommand({
                ...context,
                dataSource,
            });

            if (context.spinner) {
                context.spinner.start('Execute migrations.');
            }
            await dataSource.runMigrations({ transaction: 'all' });
            if (context.spinner) {
                context.spinner.succeed('Executed migrations.');
            }
        }
    } finally {
        await dataSource.destroy();
    }
}
