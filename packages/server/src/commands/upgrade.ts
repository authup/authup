/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createConnection } from 'typeorm';
import * as ora from 'ora';
import { ServerUpgradeContext } from './type';
import { buildDatabaseConnectionOptions } from '../database';

export async function upgradeCommand(context: ServerUpgradeContext) {
    const spinner = ora.default({
        spinner: 'dots',
    });

    spinner.start('Establish database connection.');

    const connectionOptions = await buildDatabaseConnectionOptions(context.config, context.extendDatabaseConnection);
    const connection = await createConnection(connectionOptions);

    spinner.succeed('Established database connection.');

    try {
        spinner.start('Execute migrations.');
        await connection.runMigrations({ transaction: 'all' });
        spinner.succeed('Executed migrations.');
    } finally {
        await connection.close();
    }
}
