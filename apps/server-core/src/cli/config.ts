/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ArgsDef } from 'citty';
import type { Config, ConfigReadFsOptions } from '../app/index.ts';
import { ConfigModule, readConfig } from '../app/index.ts';
import type { CLIConfigArgs } from './types.ts';

export const CLI_CONFIG_ARGS = {
    configDirectory: {
        type: 'string',
        description: 'Config directory path',
    },
    configFile: {
        type: 'string',
        description: 'Name of one or more configuration files.',
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

/**
 * The config module every CLI command boots with: env plus the threaded file
 * options, read when the module sets up (so args applied after creation still
 * count). `overrides` are spread over the NORMALIZED config, beating file and
 * env alike; they are how a role forces a flag (the console role's
 * selectors), never an operator surface.
 */
export function createCLIConfigModule(
    options: ConfigReadFsOptions = {},
    overrides: Partial<Config> = {},
) : ConfigModule {
    return new ConfigModule(async () => ({
        ...await readConfig({
            env: true,
            fs: options,
        }),
        ...overrides,
    }));
}
