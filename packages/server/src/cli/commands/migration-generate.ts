/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CommandModule } from 'yargs';
import { DataSource } from 'typeorm';
import path from 'path';
import { generateMigration } from '@authup/server-database';
import { buildDataSourceOptions } from '../../database';

export class MigrationGenerateCommand implements CommandModule {
    command = 'migration:generate';

    describe = 'Generate database migrations.';

    async handler(args: any) {
        const options = await buildDataSourceOptions();

        const dataSource = new DataSource(options);
        await dataSource.initialize();

        await generateMigration({
            dataSource,
            name: 'Default',
            directoryPath: path.join(__dirname, '..', '..', 'database', 'migrations'),
        });

        process.exit(0);
    }
}
