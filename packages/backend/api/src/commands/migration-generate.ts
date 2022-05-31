/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CommandModule } from 'yargs';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions, migrationGenerateCommand } from '@authelion/api-core';
import path from 'path';

export class MigrationGenerateCommand implements CommandModule {
    command = 'migration:generate';

    describe = 'Generate database migrations.';

    async handler(args: any) {
        const options = await buildDataSourceOptions();

        const dataSource = new DataSource(options);
        await dataSource.initialize();

        await migrationGenerateCommand({
            dataSource,
            name: 'Default',
            directory: path.join(__dirname, '..', 'database', 'migrations'),
        });

        process.exit(0);
    }
}
