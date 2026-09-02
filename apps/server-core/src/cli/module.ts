/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import fs from 'node:fs';
import path from 'node:path';
import type { Config } from '../app/index.ts';
import { PACKAGE_PATH } from '../path.ts';
import { CLI_CONFIG_ARGS, applyCLIConfigArgs, assertNoStrayPositionals } from './commands/config.ts';
import {
    defineCLIHealthCheckCommand,
    defineCLIMigrationCommand,
    defineCLIStartCommand,
} from './commands/index.ts';
import type { ConfigReadFsOptions } from '@authup/server-config';

export async function createCLIEntryPointCommand() {
    const pkgRaw = await fs.promises.readFile(
        path.join(PACKAGE_PATH, 'package.json'),
        { encoding: 'utf8' },
    );
    const pkg = JSON.parse(pkgRaw);

    const configFs : ConfigReadFsOptions<Config> = {};

    return defineCommand({
        meta: {
            name: pkg.name,
            version: pkg.version,
            description: pkg.description,
        },
        subCommands: {
            healthcheck: defineCLIHealthCheckCommand(configFs),
            migration: defineCLIMigrationCommand(configFs),
            start: defineCLIStartCommand(configFs),
        },
        args: CLI_CONFIG_ARGS,
        setup(context) {
            assertNoStrayPositionals(context.args);
            applyCLIConfigArgs(configFs, context.args);
        },
    });
}
