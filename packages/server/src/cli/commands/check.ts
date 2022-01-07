/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Arguments, Argv, CommandModule } from 'yargs';
import { createConnection } from 'typeorm';
import { useAuthServerConfig } from '../../config';
import { buildDatabaseConnectionOptions } from '../../database/utils';
import { DatabaseRootSeeder } from '../../database/seeds';

interface SeedCheckArguments extends Arguments {
    root: string;
}

export class CheckCommand implements CommandModule {
    command = 'check';

    describe = 'Check integration of the application(s).';

    builder(args: Argv) {
        return args
            .option('root', {
                alias: 'r',
                default: process.cwd(),
                describe: 'Path to the project root directory.',
            });
    }

    async handler(args: SeedCheckArguments) {
        const config = useAuthServerConfig(args.root);
        const connectionOptions = await buildDatabaseConnectionOptions(config);

        const connection = await createConnection(connectionOptions);

        try {
            await connection.synchronize();

            const seeder = new DatabaseRootSeeder({
                adminPassword: config.adminPassword,
                adminUsername: config.adminUsername,
            });

            await seeder.run(connection);
        } catch (e) {
            console.log(e);
            await connection.close();
            process.exit(1);
            throw e;
        } finally {
            await connection.close();
            process.exit(0);
        }
    }
}
