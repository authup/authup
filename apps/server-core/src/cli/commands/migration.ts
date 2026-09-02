/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import path from 'node:path';
import process from 'node:process';
import {
    checkDatabase,
    createDatabase,
    dropDatabase,
    generateMigration,
    transformFilePath,
} from 'typeorm-extension';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { DataSourceOptionsBuilder } from '../../adapters/database/index.ts';
import type { ConfigReadFsOptions } from '@authup/server-config';
import type { Config } from '../../app/index.ts';
import {
    ApplicationBuilder,
    ConfigInjectionKey,
    LoggerInjectionKey,
    ModuleName,
} from '../../app/index.ts';
import type { IContainer } from 'eldin';
import { CODE_PATH } from '../../path.ts';
import { createCLIConfigModule } from './config.ts';

enum MigrationOperation {
    GENERATE = 'generate',
    REVERT = 'revert',
    STATUS = 'status',
    RUN = 'run',
}

const OPERATIONS = Object.values(MigrationOperation);

function isMigrationOperation(value: string) : value is MigrationOperation {
    return (OPERATIONS as string[]).includes(value);
}

async function runMigrationOperation(
    container: IContainer,
    operation: MigrationOperation,
): Promise<void> {
    const config = container.resolve(ConfigInjectionKey);
    const logger = container.resolve(LoggerInjectionKey);

    const optionsBuilder = new DataSourceOptionsBuilder();

    let options: DataSourceOptions;
    if (config.db) {
        // the configuration surface is deliberately untyped: `db` is authup's
        // own loose shape, so the driver union is applied here, at the
        // boundary where the value reaches typeorm.
        options = optionsBuilder.buildWith(config.db as DataSourceOptions);
    } else {
        options = optionsBuilder.buildWithEnv();
    }

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

    const check = await checkDatabase({ options });

    if (!check.exists) {
        await createDatabase({
            options,
            synchronize: false,
            ifNotExist: true,
        });
    }

    const dataSource = new DataSource({
        ...options,
        logging: ['error', 'schema', 'migration'],
    });

    try {
        await dataSource.initialize();

        if (operation === MigrationOperation.REVERT) {
            await dataSource.undoLastMigration();
        } else if (operation === MigrationOperation.STATUS) {
            await dataSource.showMigrations();
        } else {
            await dataSource.runMigrations();
        }
    } finally {
        if (dataSource.isInitialized) {
            try {
                await dataSource.destroy();
            } catch (e) {
                logger.error(`Failed to destroy data source after migration operation: ${e}`);
            }
        }
    }
}

async function generateMigrations(): Promise<void> {
    const optionsBuilder = new DataSourceOptionsBuilder();

    const connections: DataSourceOptions[] = [
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

    const baseDirectory = transformFilePath(
        path.join(CODE_PATH, 'adapters', 'database', 'migrations'),
        './src',
        './dist',
    );

    const timestamp = Date.now();

    for (const connection of connections) {
        const dataSourceOptions = optionsBuilder.buildWith(connection);
        const directoryPath = path.join(baseDirectory, dataSourceOptions.type);

        await dropDatabase({ options: dataSourceOptions });
        await createDatabase({
            options: dataSourceOptions,
            synchronize: false,
        });

        const dataSource = new DataSource(dataSourceOptions);

        try {
            await dataSource.initialize();

            await dataSource.runMigrations();

            await generateMigration({
                dataSource,
                name: 'Default',
                directoryPath,
                timestamp,
                prettify: true,
            });
        } finally {
            if (dataSource.isInitialized) {
                try {
                    await dataSource.destroy();
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.error(e);
                }
            }
        }
    }
}

export function defineCLIMigrationCommand(configFs: ConfigReadFsOptions<Config> = {}) {
    return defineCommand({
        meta: { name: 'migration', description: 'Apply, revert or generate the database migrations.' },
        args: {
            operation: {
                required: true,
                type: 'positional',
                valueHint: OPERATIONS.join('|'),
            },
        },
        async setup(context) {
            // citty checks a positional's options nowhere, so an unknown operation
            // used to fall through to `runMigrations` (#3542).
            const { operation } = context.args;
            if (!isMigrationOperation(operation)) {
                throw new Error(`Unknown migration operation "${operation}". Expected one of: ${OPERATIONS.join(', ')}.`);
            }

            try {
                if (operation === MigrationOperation.GENERATE) {
                    await generateMigrations();
                } else {
                    const app = new ApplicationBuilder()
                        .withConfig(createCLIConfigModule(configFs))
                        .withLogger()
                        .build();

                    app.addModule({
                        name: ModuleName.DATABASE,
                        dependencies: [ModuleName.CONFIG, ModuleName.LOGGER],
                        async setup(container: IContainer): Promise<void> {
                            await runMigrationOperation(container, operation);
                        },
                    });

                    await app.setup();
                }

                process.exit(0);
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error(e);

                process.exit(1);
            }
        },
    });
}
