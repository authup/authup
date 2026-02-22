/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Logger } from '@authup/server-kit';
import { defineCommand } from 'citty';
import path from 'node:path';
import process from 'node:process';
import {
    checkDatabase,
    createDatabase, dropDatabase, generateMigration, transformFilePath,
} from 'typeorm-extension';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { DataSourceOptionsBuilder } from '../../adapters/database/index.ts';
import {
    Application, ConfigInjectionKey, ConfigModule, LoggerInjectionKey, LoggerModule,
} from '../../app/index.ts';
import type { IDIContainer } from '../../core/index.ts';
import type { Config } from '../../app/index.ts';
import { CODE_PATH } from '../../path.ts';

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
            const application = new Application([
                new ConfigModule(),
                new LoggerModule(),
                {
                    async start(container: IDIContainer): Promise<void> {
                        const config = container.resolve<Config>(ConfigInjectionKey);
                        const logger = container.resolve<Logger>(LoggerInjectionKey);

                        const optionsBuilder = new DataSourceOptionsBuilder();

                        if (
                            context.args.operation === MigrationOperation.REVERT ||
                            context.args.operation === MigrationOperation.STATUS ||
                            context.args.operation === MigrationOperation.RUN
                        ) {
                            const options = optionsBuilder.buildWith(config.db);

                            logger.debug(`Type: ${options.type}`);
                            logger.debug(`Database: ${options.database}`);

                            if (Array.isArray(options.migrations)) {
                                for (let i = 0; i < options.migrations.length; i++) {
                                    if (typeof options.migrations[i] === 'string') {
                                        logger.debug(`Migration-Directory: ${options.migrations[i]}`);
                                    }
                                }
                            } else if (typeof options.migrations === 'string') {
                                logger.debug(`Migration-Directory: ${options.migrations}`);
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

                            return;
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

                        const baseDirectory = transformFilePath(path.join(CODE_PATH, 'adapters', 'database', 'migrations'), './src', './dist');

                        const timestamp = Date.now();

                        for (let i = 0; i < connections.length; i++) {
                            const dataSourceOptions = optionsBuilder.buildWith(connections[i]);
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
                    },
                },
            ]);

            try {
                await application.start();

                process.exit(0);
            } catch (e) {
                console.error(e);

                process.exit(1);
            }
        },
    });
}
