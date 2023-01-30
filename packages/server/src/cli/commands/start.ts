/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { merge } from 'smob';
import { Arguments, Argv, CommandModule } from 'yargs';
import { setupLogger } from '../../utils';
import { startCommand } from '../../commands';
import { readConfig, readConfigFromEnv, setOptions } from '../../config';
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
        const fileConfig = await readConfig(args.root);
        const envConfig = readConfigFromEnv();

        const config = setOptions(merge(
            envConfig,
            fileConfig,
        ));

        const dataSourceOptions = await buildDataSourceOptions();
        const logger = setupLogger(config.base.writableDirectoryPath);

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
