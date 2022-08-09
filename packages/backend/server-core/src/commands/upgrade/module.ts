/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DataSource, DataSourceOptions } from 'typeorm';
import { setupDatabaseSchema } from 'typeorm-extension';
import { UpgradeCommandContext } from '../type';
import { buildDataSourceOptions } from '../../database';

export async function upgradeCommand(context: UpgradeCommandContext) {
    if (context.spinner) {
        context.spinner.start('Establish database connection.');
    }

    let dataSource : DataSource;

    if (context.dataSource) {
        dataSource = context.dataSource;
        if (!dataSource.isInitialized) {
            await dataSource.initialize();
        }
    } else {
        const options = context.dataSourceOptions || await buildDataSourceOptions();

        Object.assign(options, {
            subscribers: [],
            synchronize: false,
            migrationsRun: false,
            dropSchema: false,
        } as DataSourceOptions);

        dataSource = new DataSource(options);
        await dataSource.initialize();
    }

    if (context.spinner) {
        context.spinner.succeed('Established database connection.');
    }

    try {
        if (context.spinner) {
            context.spinner.start('Execute schema setup.');
        }

        await setupDatabaseSchema(dataSource);

        if (context.spinner) {
            context.spinner.start('Executed schema setup.');
        }
    } finally {
        if (!context.dataSource || context.dataSourceDestroyOnCompletion) {
            await dataSource.destroy();
        }
    }
}
