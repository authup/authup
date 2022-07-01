/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DataSource } from 'typeorm';
import { UpgradeCommandContext } from '../type';
import { DatabaseSeeder, buildDataSourceOptions } from '../../database';

export async function upgradeCommand(context: UpgradeCommandContext) {
    if (context.spinner) {
        context.spinner.start('Establish database connection.');
    }

    let dataSource : DataSource;

    if (context.dataSource) {
        dataSource = context.dataSource;
    } else {
        const options = context.dataSourceOptions || await buildDataSourceOptions();

        Object.assign(options, {
            subscribers: [],
            synchronize: false,
            migrationsRun: false,
            dropSchema: false,
            logging: [],
        });

        dataSource = new DataSource(options);
        await dataSource.initialize();
    }

    if (context.spinner) {
        context.spinner.succeed('Established database connection.');
    }

    try {
        if (context.spinner) {
            context.spinner.start('Execute migrations.');
        }

        await dataSource.runMigrations();

        if (context.spinner) {
            context.spinner.succeed('Executed migrations.');
        }

        if (context.spinner) {
            context.spinner.start('Execute seeder.');
        }

        const seeder = new DatabaseSeeder();
        await seeder.run(dataSource);

        if (context.spinner) {
            context.spinner.succeed('Executed seeder.');
        }
    } finally {
        if (!context.dataSource || context.dataSourceDestroyOnCompletion) {
            await dataSource.destroy();
        }
    }
}
