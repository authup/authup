/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Arguments, Argv, CommandModule } from 'yargs';
import { findConfig, setConfig, startCommand } from '@authelion/api-core';
import * as ora from 'ora';

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
        const config = await findConfig(args.root);
        setConfig(config);

        const spinner = ora.default({
            spinner: 'dots',
        });

        await startCommand({
            spinner,
        });
    }
}
