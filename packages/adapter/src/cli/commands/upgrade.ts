/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { Arguments, Argv, CommandModule } from 'yargs';
import { buildConnectionOptions } from 'typeorm-extension';
import { createConnection } from 'typeorm';
import { useConfig } from '../../config';
import {
    buildDatabaseConnectionOptions,
    createDatabaseDefaultConnectionOptions,
    extendDatabaseConnectionOptions,
} from '../../database/utils';

interface UpgradeArguments extends Arguments {
    root: string;
}

export class UpgradeCommand implements CommandModule {
    command = 'upgrade';

    describe = 'Run upgrade operation.';

    // eslint-disable-next-line class-methods-use-this
    builder(args: Argv) {
        return args
            .option('root', {
                alias: 'r',
                default: process.cwd(),
                describe: 'Path to the project root directory.',
            });
    }

    // eslint-disable-next-line class-methods-use-this
    async handler(args: UpgradeArguments) {
        const config = useConfig(args.root);
        const connectionOptions = await buildDatabaseConnectionOptions(config);

        const connection = await createConnection(connectionOptions);

        try {
            await connection.runMigrations({ transaction: 'all' });
            // eslint-disable-next-line no-useless-catch
        } finally {
            await connection.close();
        }
    }
}
