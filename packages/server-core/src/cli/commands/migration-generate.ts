/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import process from 'node:process';
import { createDatabase, dropDatabase, generateMigration } from 'typeorm-extension';
import type { Arguments, Argv, CommandModule } from 'yargs';
import type { DataSourceOptions } from 'typeorm';
import { DataSource } from 'typeorm';
import {
    applyConfig, buildConfig, readConfigRaw,
} from '../../config';
import { extendDataSourceOptions } from '../../database';

interface MigrationGenerateArguments extends Arguments {
    configDirectory: string | undefined;
    configFile: string | undefined;
}

export class MigrationGenerateCommand implements CommandModule {
    command = 'migration:generate';

    describe = 'Generate database migrations.';

    builder(args: Argv) {
        return args
            .option('configDirectory', {
                alias: 'cD',
                describe: 'Config directory path.',
            })
            .option('configFile', {
                alias: 'cF',
                describe: 'Name of one or more configuration files.',
            });
    }

    async handler(args: MigrationGenerateArguments) {
        const raw = await readConfigRaw({
            env: true,
            fs: {
                cwd: args.configDirectory,
                file: args.configFile,
            },
        });
        const config = buildConfig(raw);
        applyConfig(config);

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
                database: path.join(config.writableDirectoryPath, 'migrations.sql'),
            },
        ];

        const baseDirectory = path.join(__dirname, '..', '..', 'database', 'migrations');
        const timestamp = Date.now();

        for (let i = 0; i < connections.length; i++) {
            const dataSourceOptions = extendDataSourceOptions(connections[i]);
            const directoryPath = path.join(baseDirectory, dataSourceOptions.type);

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
                prettify: true,
            });
        }

        process.exit(0);
    }
}
