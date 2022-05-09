/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DataSource } from 'typeorm';
import { DatabaseSeeder, buildDataSourceOptions } from '../database';
import { CheckCommandContext } from './type';
import { useConfig } from '../config';

export async function checkCommand(context?: CheckCommandContext) {
    context = context || {};

    const config = await useConfig();

    if (context.spinner) {
        context.spinner.start('Establish database connection.');
    }

    const dataSourceOptions = await buildDataSourceOptions();
    const connection = new DataSource(dataSourceOptions);

    await connection.initialize();

    if (context.spinner) {
        context.spinner.succeed('Established database connection.');
    }

    try {
        if (context.spinner) {
            context.spinner.start('Seeding database.');
        }

        const seeder = new DatabaseSeeder(config.database.seed);
        await seeder.run(connection);

        if (context.spinner) {
            context.spinner.succeed('Seeded database.');
        }
    } finally {
        await connection.destroy();
    }
}
