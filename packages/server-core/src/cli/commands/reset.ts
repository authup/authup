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
    configDirectory: string | undefined;
    configFile: string | undefined;
}

export class ResetCommand implements CommandModule {
    command = 'reset';

    describe = 'Reset the server.';

    builder(args: Argv) {
        return args
            .option('configDirectory', {
                alias: 'cD',
                describe: 'Config directory path.',
            })
            .option('configFile', {
                alias: 'cF',
                describe: 'Name of one or more configuration files.',
            });
    }

    async handler(args: ResetArguments) {
        const raw = await readConfigRaw({
            env: true,
            fs: {
                cwd: args.configDirectory,
                file: args.configFile,
            },
        });
        const config = buildConfig(raw);
        setConfig(config);
        applyConfig(config);

        await executeResetCommand();

        process.exit(0);
    }
}
