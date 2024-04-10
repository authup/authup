/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Arguments, Argv, CommandModule } from 'yargs';
import {
    resetCommand,
} from '../../commands';
import { setupConfig } from '../../config';
import { buildDataSourceOptions } from '../../database';

interface ResetArguments extends Arguments {
    config: string | undefined;
}

export class ResetCommand implements CommandModule {
    command = 'reset';

    describe = 'Reset the server.';

    builder(args: Argv) {
        return args
            .option('config', {
                alias: 'c',
                describe: 'Path to one ore more configuration files.',
            });
    }

    async handler(args: ResetArguments) {
        await setupConfig({
            filePath: args.config,
        });

        const dataSourceOptions = await buildDataSourceOptions();

        await resetCommand({
            dataSourceOptions,
        });

        process.exit(0);
    }
}
