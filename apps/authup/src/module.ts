/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthupConfig, ConfigReadFsOptions } from '@authup/server-config';
import {
    assertNoStrayPositionals,
    defineCLIMigrationCommand,
    defineCLIWorkerCommand,
} from '@authup/server-core';
import { type ArgsDef, defineCommand } from 'citty';
import fs from 'node:fs';
import path from 'node:path';
import { PACKAGE_PATH } from './path.ts';
import {
    defineCLIConfigCommand,
    defineCLIConsoleCommand,
    defineCLIHealthCheckCommand,
    defineCLIStartCommand,
} from './commands/index.ts';
import type { ObjectLiteral } from '@authup/kit';

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

export type CLIConfigArgs = {
    configDirectory?: string,
    configFile?: string,
};

function applyCLIConfigArgs<T extends ObjectLiteral = ObjectLiteral>(
    options: ConfigReadFsOptions<T>,
    args: CLIConfigArgs,
) : ConfigReadFsOptions<T> {
    if (args.configDirectory) {
        options.cwd = args.configDirectory;
    }

    if (args.configFile) {
        options.file = args.configFile;
    }

    return options;
}

export async function createCLIEntryPointCommand() {
    const pkgRaw = await fs.promises.readFile(
        path.join(PACKAGE_PATH, 'package.json'),
        { encoding: 'utf8' },
    );
    const pkg = JSON.parse(pkgRaw);

    const configFs : ConfigReadFsOptions<AuthupConfig> = {};

    return defineCommand({
        meta: {
            name: pkg.name,
            version: pkg.version,
            description: pkg.description,
        },
        subCommands: {
            config: defineCLIConfigCommand(configFs),
            console: defineCLIConsoleCommand(configFs),
            healthcheck: defineCLIHealthCheckCommand(configFs),
            migration: defineCLIMigrationCommand(configFs),
            start: defineCLIStartCommand(configFs),

            // The API and the IdP alone: the page GETs still redirect to the
            // console service, which someone else runs.
            core: defineCLIStartCommand(configFs),
            // The batteries-included single container: server-core plus every
            worker: defineCLIWorkerCommand(configFs),
        },
        args: CLI_CONFIG_ARGS,
        setup(context) {
            assertNoStrayPositionals(context.args);
            applyCLIConfigArgs(configFs, context.args);
        },
    });
}
