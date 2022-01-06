/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { Arguments, Argv, CommandModule } from 'yargs';
import {
    buildConnectionOptions, dropDatabase,
} from 'typeorm-extension';
import {
    buildDatabaseConnectionOptions,
    createDatabaseDefaultConnectionOptions,
    extendDatabaseConnectionOptions,
} from '../../database/utils';
import { useAuthServerConfig } from '../../config';

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
        const config = useAuthServerConfig(args.root);
        const connectionOptions = await buildDatabaseConnectionOptions(config);

        await dropDatabase({ ifExist: true }, connectionOptions);

        process.exit(0);
    }
}
