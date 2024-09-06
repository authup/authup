/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Arguments, Argv, CommandModule } from 'yargs';
import {
    executeResetCommand,
} from '../../commands';
import {
    applyConfig, buildConfig, readConfigRaw, setConfig,
} from '../../config';

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
        const raw = await readConfigRaw({
            env: true,
            fs: {
                file: args.config,
            },
        });
        const config = buildConfig(raw);
        setConfig(config);
        applyConfig(config);

        await executeResetCommand();

        process.exit(0);
    }
}
