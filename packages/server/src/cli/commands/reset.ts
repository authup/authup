/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Arguments, Argv, CommandModule } from 'yargs';
import {
    dropDatabase,
} from 'typeorm-extension';
import {
    buildDatabaseConnectionOptions,
} from '../../database';
import { useConfig } from '../../config';
import { resetCommand } from '../../commands/reset';

interface ResetArguments extends Arguments {
    root: string;
}

export class ResetCommand implements CommandModule {
    command = 'reset';

    describe = 'Run reset operation.';

    builder(args: Argv) {
        return args
            .option('root', {
                alias: 'r',
                default: process.cwd(),
                describe: 'Path to the project root directory.',
            });
    }

    async handler(args: ResetArguments) {
        const config = useConfig(args.root);

        await resetCommand({ config });

        process.exit(0);
    }
}
