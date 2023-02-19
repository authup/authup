/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { merge } from 'smob';
import { createDatabase, dropDatabase } from 'typeorm-extension';
import type { CommandModule } from 'yargs';
import type { DataSourceOptions } from 'typeorm';
import { DataSource } from 'typeorm';
import path from 'path';
import { extendDataSourceOptions, generateMigration } from '@authup/server-database';
import { readConfig, readConfigFromEnv, setOptions } from '../../config';

export class MigrationGenerateCommand implements CommandModule {
    command = 'migration:generate';

    describe = 'Generate database migrations.';

    async handler(args: any) {
        const fileConfig = await readConfig(args.root);
        const envConfig = readConfigFromEnv();

        const config = setOptions(merge(
            envConfig,
            fileConfig,
        ));

        const connections : DataSourceOptions[] = [
            {
                type: 'postgres',
                database: 'migrations',
                host: 'localhost',
                port: 5432,
                username: 'postgres',
                password: 'start123',
            },
            {
                type: 'mysql',
                database: 'migrations',
                host: 'localhost',
                port: 3306,
                username: 'root',
                password: 'start123',
            },
            {
                type: 'better-sqlite3',
                database: path.join(config.base.writableDirectoryPath, 'migrations.sql'),
            },
        ];

        const baseDirectory = path.join(__dirname, '..', '..', 'database', 'migrations');
        const timestamp = Date.now();

        for (let i = 0; i < connections.length; i++) {
            const dataSourceOptions = await extendDataSourceOptions(connections[i]);
            const directoryPath = path.join(baseDirectory, dataSourceOptions.type);

            Object.assign(dataSourceOptions, {
                migrations: [
                    path.join(directoryPath, '*{.ts,.js}'),
                ],
            } satisfies Partial<DataSourceOptions>);

            await dropDatabase({ options: dataSourceOptions });
            await createDatabase({ options: dataSourceOptions, synchronize: false });

            const dataSource = new DataSource(dataSourceOptions);
            await dataSource.initialize();
            await dataSource.runMigrations();

            await generateMigration({
                dataSource,
                name: 'Default',
                directoryPath,
                timestamp,
            });
        }

        process.exit(0);
    }
}
