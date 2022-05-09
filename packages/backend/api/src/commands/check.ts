/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Arguments, Argv, CommandModule } from 'yargs';
import { checkCommand, findConfig, setConfig } from '@authelion/api-core';
import * as ora from 'ora';

interface SeedCheckArguments extends Arguments {
    root: string;
}

export class CheckCommand implements CommandModule {
    command = 'check';

    describe = 'Check integration of the application(s).';

    builder(args: Argv) {
        return args
            .option('root', {
                alias: 'r',
                default: process.cwd(),
                describe: 'Path to the project root directory.',
            });
    }

    async handler(args: SeedCheckArguments) {
        const config = await findConfig(args.root);
        setConfig(config);

        const spinner = ora.default({
            spinner: 'dots',
        });

        try {
            await checkCommand({ spinner });
            process.exit(0);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.log(e);
            process.exit(0);
        }
    }
}
