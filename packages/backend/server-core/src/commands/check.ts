/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import * as ora from 'ora';
import { createConnection } from 'typeorm';
import { DatabaseRootSeeder, buildDatabaseConnectionOptions } from '../database';
import { CheckCommandContext } from './type';
import { useConfig } from '../config';

export async function checkCommand(context: CheckCommandContext) {
    const spinner = ora.default({
        spinner: 'dots',
    });

    context.config ??= useConfig();

    spinner.start('Establish database connection.');

    const connectionOptions = await buildDatabaseConnectionOptions(context.config, context.databaseConnectionMerge);
    const connection = await createConnection(connectionOptions);

    spinner.succeed('Established database connection.');

    try {
        spinner.start('Seeding database.');

        const seeder = new DatabaseRootSeeder({
            userName: context.config.adminUsername,
            userPassword: context.config.adminPassword,

            robotSecret: context.config.robotSecret,

            permissions: context.config.permissions,
            ...(context.databaseSeederOptions ? context.databaseSeederOptions : {}),
        });
        await seeder.run(connection);

        spinner.succeed('Seeded database.');
    } finally {
        await connection.close();
    }
}
