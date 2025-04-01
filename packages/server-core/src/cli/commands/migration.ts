/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useLogger } from '@authup/server-kit';
import { defineCommand } from 'citty';
import path from 'node:path';
import process from 'node:process';
import {
    checkDatabase,
    createDatabase, dropDatabase, generateMigration, useDataSourceOptions,
} from 'typeorm-extension';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { applyConfig, useConfig } from '../../config';
import { extendDataSourceOptions } from '../../database';

enum MigrationOperation {
    GENERATE = 'generate',
    REVERT = 'revert',
    STATUS = 'status',
    RUN = 'run',
}

export function defineCLIMigrationCommand() {
    return defineCommand({
        meta: {
            name: 'migration',
        },
        args: {
            operation: {
                required: true,
                type: 'positional',
                options: Object.values(MigrationOperation),
                valueHint: Object.values(MigrationOperation).join('|'),
            },
        },
        async setup(context) {
            const config = useConfig();
            applyConfig(config);

            if (
                context.args.operation === MigrationOperation.REVERT ||
                context.args.operation === MigrationOperation.STATUS ||
                context.args.operation === MigrationOperation.RUN
            ) {
                const options = await useDataSourceOptions();
                extendDataSourceOptions(options);

                const logger = useLogger();
                logger.info(`Type: ${options.type}`);
                logger.info(`Database: ${options.database}`);
                if (Array.isArray(options.migrations)) {
                    for (let i = 0; i < options.migrations.length; i++) {
                        if (typeof options.migrations[i] === 'string') {
                            logger.info(`Migration-Directory: ${options.migrations[i]}`);
                        }
                    }
                } else if (typeof options.migrations === 'string') {
                    logger.info(`Migration-Directory: ${options.migrations}`);
                }

                const check = await checkDatabase({
                    options,
                });

                if (!check.exists) {
                    await createDatabase({ options, synchronize: false, ifNotExist: true });
                }

                const dataSource = new DataSource({
                    ...options,
                    logging: ['error', 'schema', 'migration'],
                });
                await dataSource.initialize();

                if (context.args.operation === MigrationOperation.REVERT) {
                    await dataSource.undoLastMigration();
                } else if (context.args.operation === MigrationOperation.STATUS) {
                    await dataSource.showMigrations();
                } else {
                    await dataSource.runMigrations();
                }

                await dataSource.destroy();

                process.exit(0);
            }

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
        },
    });
}
