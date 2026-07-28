/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ArgsDef } from 'citty';
import type { ConfigReadFsOptions } from '../app/index.ts';
import { ConfigModule, readConfig } from '../app/index.ts';
import type { CLIConfigArgs } from './types.ts';

export const CLI_CONFIG_ARGS = {
    configDirectory: {
        type: 'string',
        description: 'Config directory path',
        alias: 'cD',
    },
    configFile: {
        type: 'string',
        description: 'Name of one or more configuration files.',
        alias: 'cF',
    },
} satisfies ArgsDef;

export function applyCLIConfigArgs(
    options: ConfigReadFsOptions,
    args: CLIConfigArgs,
) : ConfigReadFsOptions {
    if (args.configDirectory) {
        options.cwd = args.configDirectory;
    }

    if (args.configFile) {
        options.file = args.configFile;
    }

    return options;
}

export function createCLIConfigModule(options: ConfigReadFsOptions = {}) : ConfigModule {
    return new ConfigModule(() => readConfig({
        env: true,
        fs: options,
    }));
}
