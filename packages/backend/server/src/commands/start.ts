/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Arguments, Argv, CommandModule } from 'yargs';
import { loadConfig, setConfig, startCommand } from '@authelion/server-core';
import * as ora from 'ora';

import { buildDataSourceOptions } from '../database/utils';

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
        const config = await loadConfig(args.root);
        setConfig(config);

        const dataSourceOptions = await buildDataSourceOptions();

        const spinner = ora.default({
            spinner: 'dots',
        });

        await startCommand({
            spinner,
            dataSourceOptions,
        });
    }
}
