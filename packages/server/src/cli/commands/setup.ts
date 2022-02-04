/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Arguments, Argv, CommandModule } from 'yargs';
import { useConfig } from '../../config';
import { setupCommand } from '../../commands/setup';

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

        try {
            await setupCommand({
                config,
                ...args,
            });
        } catch (e) {
            // eslint-disable-next-line no-console
            console.log(e);
            process.exit(1);
        }

        process.exit(0);
    }
}
