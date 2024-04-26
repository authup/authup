/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createDatabase, synchronizeDatabaseSchema } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { useConfig } from '../config';
import { useLogger } from '../core';
import { DatabaseSeeder, buildDataSourceOptions, saveSeedResult } from '../database';
import { generateSwaggerDocumentation } from '../http';
import type { SetupCommandContext } from './type';

export async function setupCommand(context?: SetupCommandContext) {
    context = context || {};

    if (
        typeof context.database === 'undefined' &&
        typeof context.databaseSeed === 'undefined' &&
        typeof context.databaseSchema === 'undefined' &&
        typeof context.documentation === 'undefined'
    ) {
        // eslint-disable-next-line no-multi-assign
        context.database = context.databaseSeed = context.databaseSchema = context.documentation = true;
    }

    const config = useConfig();
    const logger = useLogger();

    if (context.documentation) {
        logger.info('Generating documentation.');

        await generateSwaggerDocumentation({
            rootPath: config.rootPath,
            writableDirectoryPath: config.writableDirectoryPath,
            baseUrl: config.publicUrl,
        });

        logger.info('Generated documentation.');
    }

    if (context.database || context.databaseSchema || context.databaseSeed) {
        /**
         * Setup database with schema & seeder
         */
        const options = context.dataSourceOptions || await buildDataSourceOptions();

        if (context.database) {
            logger.info('Creating database.');

            await createDatabase({ options, synchronize: false });

            logger.info('Created database.');
        }

        const dataSource = new DataSource(options);
        await dataSource.initialize();

        try {
            if (context.databaseSchema) {
                logger.info('Execute schema setup.');

                await synchronizeDatabaseSchema(dataSource);

                logger.info('Executed schema setup.');
            }
        } catch (e) {
            logger.error('Setup of the database schema failed.');

            throw e;
        }

        try {
            if (context.databaseSeed) {
                logger.info('Seeding database.');

                const seeder = new DatabaseSeeder({
                    userAdminPasswordReset: true,
                    robotAdminSecretReset: true,
                });

                const seederData = await seeder.run(dataSource);

                logger.info('Seeded database.');

                if (seederData.robot) {
                    await saveSeedResult(config.writableDirectoryPath, seederData);
                }
            }
        } catch (e) {
            logger.error('Seeding the database failed.');

            throw e;
        }

        await dataSource.destroy();
    }
}
