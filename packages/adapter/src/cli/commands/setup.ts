/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Arguments, Argv, CommandModule } from 'yargs';
import { createDatabase } from 'typeorm-extension';
import { createConnection } from 'typeorm';
import path from 'path';
import { generateSwaggerDocumentation } from '../../http/swagger';
import { useConfig } from '../../config';
import {
    buildDatabaseConnectionOptions,
} from '../../database/utils';
import { DatabaseRootSeeder } from '../../database/seeds';
import { createSecurityKeyPair } from '../../utils';

interface SetupArguments extends Arguments {
    root: string;
    keyPair: boolean;
    database: boolean;
    databaseSeeder: boolean;
    documentation: boolean;
}

export class SetupCommand implements CommandModule {
    command = 'setup';

    describe = 'Run initial setup operation.';

    // eslint-disable-next-line class-methods-use-this
    builder(args: Argv) {
        return args
            .option('root', {
                alias: 'r',
                default: process.cwd(),
                describe: 'Path to the project root directory.',
            })

            .option('keyPair', {
                describe: 'Create key-pair.',
                type: 'boolean',
            })

            .option('database', {
                alias: 'db',
                describe: 'Create database.',
                type: 'boolean',
            })

            .option('databaseSeeder', {
                alias: 'db:seed',
                describe: 'Seed database.',
                type: 'boolean',
            })

            .option('documentation', {
                alias: 'docs',
                describe: 'Create swagger documentation.',
                type: 'boolean',
            });
    }

    // eslint-disable-next-line class-methods-use-this
    async handler(args: SetupArguments) {
        const config = useConfig(args.root);
        const writableDirectoryPath = path.join(config.rootPath, config.writableDirectory);

        if (
            !args.keyPair &&
            !args.database &&
            !args.databaseSeeder &&
            !args.documentation
        ) {
            // eslint-disable-next-line no-multi-assign
            args.keyPair = args.database = args.databaseSeeder = args.documentation = true;
        }

        /**
         * Setup auth module
         */
        if (args.keyPair) {
            await createSecurityKeyPair({
                directory: writableDirectoryPath,
            });
        }

        if (args.documentation) {
            await generateSwaggerDocumentation({
                rootDirectoryPath: config.rootPath,
                writableDirectory: config.writableDirectory,
                selfUrl: config.selfUrl,
            });
        }

        if (args.database || args.databaseSeeder) {
            /**
             * Setup database with schema & seeder
             */
            const connectionOptions = await buildDatabaseConnectionOptions(config);

            if (args.database) {
                await createDatabase({ ifNotExist: true }, connectionOptions);
            }

            const connection = await createConnection(connectionOptions);
            try {
                await connection.synchronize();

                if (args.databaseSeeder) {
                    const seeder = new DatabaseRootSeeder({
                        adminPassword: config.adminPassword,
                        adminUsername: config.adminUsername,
                    });

                    await seeder.run(connection);
                }
            } catch (e) {
                // eslint-disable-next-line no-console
                console.log(e);
                await connection.close();
                process.exit(1);
                throw e;
            } finally {
                await connection.close();
            }
        }

        process.exit(0);
    }
}
