/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Arguments, Argv, CommandModule } from 'yargs';
import { createLogger } from '../../core';
import { startCommand } from '../../commands';
import { setupConfig } from '../../config';
import { buildDataSourceOptions } from '../../database';

interface StartArguments extends Arguments {
    root: string;
}

export class StartCommand implements CommandModule {
    command = 'start';

    describe = 'Start the server.';

    builder(args: Argv) {
        return args
            .option('root', {
                alias: 'r',
                default: process.cwd(),
                describe: 'Path to the project root directory.',
            });
    }

    async handler(args: StartArguments) {
        const config = await setupConfig();

        const dataSourceOptions = await buildDataSourceOptions();
        const logger = createLogger({
            directory: config.get('writableDirectoryPath'),
            env: config.get('env'),
        });

        try {
            await startCommand({
                logger,
                dataSourceOptions,
            });
        } catch (e) {
            logger.error(e);

            process.exit(1);
        }
    }
}
