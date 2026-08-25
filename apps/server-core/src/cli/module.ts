/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ParsedArgs } from 'citty';
import { defineCommand } from 'citty';
import fs from 'node:fs';
import path from 'node:path';
import type { ConfigReadFsOptions } from '../app/index.ts';
import { PACKAGE_PATH } from '../path.ts';
import { CLI_CONFIG_ARGS, applyCLIConfigArgs } from './config.ts';
import {
    defineCLIConsoleCommand,
    defineCLIHealthCheckCommand,
    defineCLIMigrationCommand,
    defineCLIStartCommand,
    defineCLIWorkerCommand,
} from './commands/index.ts';

const CLI_COMMANDS_WITHOUT_POSITIONALS = new Set(['start', 'worker']);

export function assertNoStrayPositionals(args: Pick<ParsedArgs, '_'>) : void {
    const [command, ...rest] = args._;

    if (!command || !CLI_COMMANDS_WITHOUT_POSITIONALS.has(command) || rest.length === 0) {
        return;
    }

    throw new Error(`Unexpected argument "${rest[0]}" for command "${command}".`);
}

export async function createCLIEntryPointCommand() {
    const pkgRaw = await fs.promises.readFile(
        path.join(PACKAGE_PATH, 'package.json'),
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
            console: defineCLIConsoleCommand(configFs),
            healthcheck: defineCLIHealthCheckCommand(configFs),
            migration: defineCLIMigrationCommand(configFs),
            start: defineCLIStartCommand(configFs),
            worker: defineCLIWorkerCommand(configFs),
        },
        args: CLI_CONFIG_ARGS,
        setup(context) {
            assertNoStrayPositionals(context.args);
            applyCLIConfigArgs(configFs, context.args);
        },
    });
}
