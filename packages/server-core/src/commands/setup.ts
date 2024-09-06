/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createDatabase, synchronizeDatabaseSchema, useDataSourceOptions } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { useLogger } from '@authup/server-kit';
import { useConfig } from '../config';
import { DatabaseSeeder, extendDataSourceOptions } from '../database';
import { generateSwaggerDocumentation } from '../http';
import type { SetupCommandContext } from './types';

export async function executeSetupCommand(context: SetupCommandContext = {}) {
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
        const options = await useDataSourceOptions();
        extendDataSourceOptions(options);

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

                config.userAdminPasswordReset = true;
                config.robotAdminSecretReset = true;

                const seeder = new DatabaseSeeder(config);

                await seeder.run(dataSource);

                logger.info('Seeded database.');
            }
        } catch (e) {
            logger.error('Seeding the database failed.');

            throw e;
        }

        await dataSource.destroy();
    }
}
