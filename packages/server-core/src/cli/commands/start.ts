/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Arguments, Argv, CommandModule } from 'yargs';
import { startCommand } from '../../commands';
import { setupConfig, setupLogger } from '../../config';
import { useLogger } from '../../core';
import { buildDataSourceOptions } from '../../database';

interface StartArguments extends Arguments {
    config: string | undefined;
}

export class StartCommand implements CommandModule {
    command = 'start';

    describe = 'Start the server.';

    builder(args: Argv) {
        return args
            .option('config', {
                alias: 'c',
                describe: 'Path to one ore more configuration files.',
            });
    }

    async handler(args: StartArguments) {
        const config = await setupConfig({
            filePath: args.config,
        });

        const dataSourceOptions = await buildDataSourceOptions();
        setupLogger({
            directory: config.writableDirectoryPath,
            env: config.env,
        });

        try {
            await startCommand({
                dataSourceOptions,
            });
        } catch (e) {
            useLogger().error(e);

            process.exit(1);
        }
    }
}
