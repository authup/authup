/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Arguments, Argv, CommandModule } from 'yargs';
import { loadConfig, setConfig, upgradeCommand } from '@authelion/server-core';

import { buildDataSourceOptions } from '../database/utils';

interface UpgradeArguments extends Arguments {
    root: string;
}

export class UpgradeCommand implements CommandModule {
    command = 'upgrade';

    describe = 'Upgrade the server.';

    // eslint-disable-next-line class-methods-use-this
    builder(args: Argv) {
        return args
            .option('root', {
                alias: 'r',
                default: process.cwd(),
                describe: 'Path to the project root directory.',
            });
    }

    async handler(args: UpgradeArguments) {
        const config = await loadConfig(args.root);
        setConfig(config);

        const dataSourceOptions = await buildDataSourceOptions();

        try {
            await upgradeCommand({
                dataSourceOptions,
            });

            process.exit(0);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.log(e);

            process.exit(1);
        }
    }
}
