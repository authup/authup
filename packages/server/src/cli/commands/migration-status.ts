/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CommandModule } from 'yargs';
import { DataSource } from 'typeorm';

import { buildDataSourceOptions } from '../../database/utils';

export class MigrationStatusCommand implements CommandModule {
    command = 'migration:status';

    describe = 'Status of database migrations.';

    async handler(args: any) {
        const options = await buildDataSourceOptions();

        const dataSource = new DataSource(options);
        await dataSource.initialize();

        try {
            await dataSource.showMigrations();
            // eslint-disable-next-line no-useless-catch
        } finally {
            await dataSource.destroy();
        }

        process.exit(0);
    }
}
