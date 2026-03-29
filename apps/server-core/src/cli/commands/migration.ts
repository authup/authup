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
    createDatabase, dropDatabase, generateMigration, transformFilePath,
} from 'typeorm-extension';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { DataSourceOptionsBuilder } from '../../adapters/database/index.ts';
import {
    ApplicationBuilder, ConfigInjectionKey, LoggerInjectionKey, ModuleName,
} from '../../app/index.ts';
import type { IContainer } from 'eldin';
import { CODE_PATH } from '../../path.ts';

enum MigrationOperation {
    GENERATE = 'generate',
    REVERT = 'revert',
    STATUS = 'status',
    RUN = 'run',
}

async function runMigrationOperation(
    container: IContainer,
    operation: string,
): Promise<void> {
    const config = container.resolve(ConfigInjectionKey);
    const logger = container.resolve(LoggerInjectionKey);

    const optionsBuilder = new DataSourceOptionsBuilder();

    let options: DataSourceOptions;
    if (config.db) {
        options = optionsBuilder.buildWith(config.db);
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
        await createDatabase({ options, synchronize: false, ifNotExist: true });
    }

    const dataSource = new DataSource({
        ...options,
        logging: ['error', 'schema', 'migration'],
    });
    await dataSource.initialize();

    try {
        if (operation === MigrationOperation.REVERT) {
            await dataSource.undoLastMigration();
        } else if (operation === MigrationOperation.STATUS) {
            await dataSource.showMigrations();
        } else {
            await dataSource.runMigrations();
        }
    } finally {
        await dataSource.destroy();
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
        await createDatabase({ options: dataSourceOptions, synchronize: false });

        const dataSource = new DataSource(dataSourceOptions);
        await dataSource.initialize();

        try {
            await dataSource.runMigrations();

            await generateMigration({
                dataSource,
                name: 'Default',
                directoryPath,
                timestamp,
                prettify: true,
            });
        } finally {
            await dataSource.destroy();
        }
    }
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
            try {
                if (context.args.operation === MigrationOperation.GENERATE) {
                    await generateMigrations();
                } else {
                    const app = new ApplicationBuilder()
                        .withConfig()
                        .withLogger()
                        .build();

                    app.addModule({
                        name: ModuleName.DATABASE,
                        dependencies: [ModuleName.CONFIG, ModuleName.LOGGER],
                        async setup(container: IContainer): Promise<void> {
                            await runMigrationOperation(container, context.args.operation);
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
