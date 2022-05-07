/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { createDatabase } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { createKeyPair } from '@authelion/api-utils';
import { SetupCommandContext } from './type';
import { generateSwaggerDocumentation } from '../http';
import { DatabaseRootSeeder, buildDataSourceOptions } from '../database';
import { setConfig, useConfig } from '../config';

export async function setupCommand(context: SetupCommandContext) {
    if (
        typeof context.keyPair === 'undefined' &&
        typeof context.database === 'undefined' &&
        typeof context.databaseSeeder === 'undefined' &&
        typeof context.documentation === 'undefined'
    ) {
        // eslint-disable-next-line no-multi-assign
        context.keyPair = context.database = context.databaseSeeder = context.documentation = true;
    }

    context.keyPair ??= true;
    context.database ??= true;
    context.databaseSeeder ??= true;
    context.documentation ??= true;

    if (context.config) {
        setConfig(context.config);
    }

    context.config ??= await useConfig();

    const writableDirectoryPath = path.join(
        context.config.rootPath,
        context.config.writableDirectory,
    );

    if (context.keyPair) {
        if (context.spinner) {
            context.spinner.start('Generating rsa key-pair.');
        }

        await createKeyPair({
            directory: writableDirectoryPath,
        });

        if (context.spinner) {
            context.spinner.succeed('Generated rsa key-pair.');
        }
    }

    if (context.documentation) {
        if (context.spinner) {
            context.spinner.start('Generating documentation.');
        }

        await generateSwaggerDocumentation({
            rootDirectoryPath: context.config.rootPath,
            writableDirectory: context.config.writableDirectory,
            selfUrl: context.config.selfUrl,
        });

        if (context.spinner) {
            context.spinner.start('Generated documentation.');
        }
    }

    if (context.database || context.databaseSeeder) {
        /**
         * Setup database with schema & seeder
         */
        const options = await buildDataSourceOptions(context.config, context.databaseConnectionMerge);

        if (context.database) {
            if (context.spinner) {
                context.spinner.start('Creating database.');
            }

            await createDatabase({ options });

            if (context.spinner) {
                context.spinner.succeed('Created database.');
            }
        }

        const dataSource = new DataSource(options);

        await dataSource.initialize();

        try {
            if (context.spinner) {
                context.spinner.start('Synchronize database schema.');
            }

            await dataSource.synchronize();
            if (context.spinner) {
                context.spinner.succeed('Synchronized database schema.');
            }

            if (context.databaseSeeder) {
                if (context.spinner) {
                    context.spinner.start('Seeding database.');
                }

                const seeder = new DatabaseRootSeeder({
                    userName: context.config.admin.username,
                    userPassword: context.config.admin.password,
                    userPasswordReset: true,

                    robotSecret: context.config.robot.secret,
                    robotSecretReset: true,

                    permissions: context.config.permissions,

                    ...(context.databaseSeederOptions ? context.databaseSeederOptions : {}),
                });

                if (context.spinner) {
                    context.spinner.succeed('Seeded database.');
                }

                const seederData = await seeder.run(dataSource);
                if (context.spinner) {
                    context.spinner.info(`Robot ID: ${seederData.robot.id}`);
                    context.spinner.info(`Robot Secret: ${seederData.robot.secret}`);
                }
            }
        } catch (e) {
            if (context.spinner) {
                context.spinner.fail('Synchronizing or seeding the database failed.');
            }
            throw e;
        } finally {
            await dataSource.destroy();
        }
    }
}
