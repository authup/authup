/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DataSource } from 'typeorm';
import { DatabaseRootSeeder, buildDataSourceOptions } from '../database';
import { CheckCommandContext } from './type';
import { useConfig } from '../config';

export async function checkCommand(context: CheckCommandContext) {
    context.config ??= useConfig();

    if (context.spinner) {
        context.spinner.start('Establish database connection.');
    }

    const dataSourceOptions = await buildDataSourceOptions(context.config, context.databaseConnectionMerge);
    const connection = new DataSource(dataSourceOptions);

    await connection.initialize();

    if (context.spinner) {
        context.spinner.succeed('Established database connection.');
    }

    try {
        if (context.spinner) {
            context.spinner.start('Seeding database.');
        }

        const seeder = new DatabaseRootSeeder({
            userName: context.config.adminUsername,
            userPassword: context.config.adminPassword,

            robotSecret: context.config.robotSecret,

            permissions: context.config.permissions,
            ...(context.databaseSeederOptions ? context.databaseSeederOptions : {}),
        });

        await seeder.run(connection);

        if (context.spinner) {
            context.spinner.succeed('Seeded database.');
        }
    } finally {
        await connection.destroy();
    }
}
