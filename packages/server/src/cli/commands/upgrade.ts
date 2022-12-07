/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { merge } from 'smob';
import { Arguments, Argv, CommandModule } from 'yargs';
import {
    upgradeCommand,
} from '../../commands';
import { readConfigFromEnv, setConfigOptions } from '../../config';
import { readConfig } from '../../config/utils/read';

import { buildDataSourceOptions } from '../../database/utils';

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
        const fileConfig = readConfig(args.root);
        const envConfig = readConfigFromEnv();

        setConfigOptions(merge(
            envConfig,
            fileConfig,
        ));

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
