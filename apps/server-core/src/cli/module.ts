/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import type { ConfigReadFsOptions } from '../app/index.ts';
import { CLI_CONFIG_ARGS, applyCLIConfigArgs } from './config.ts';
import {
    defineCLIHealthCheckCommand,
    defineCLIMigrationCommand,
    defineCLIStartCommand,
} from './commands/index.ts';

export async function createCLIEntryPointCommand() {
    const pkgRaw = await fs.promises.readFile(
        path.join(process.cwd(), 'package.json'),
        { encoding: 'utf8' },
    );
    const pkg = JSON.parse(pkgRaw);

    const configFs : ConfigReadFsOptions = {};

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
            applyCLIConfigArgs(configFs, context.args);
        },
    });
}
