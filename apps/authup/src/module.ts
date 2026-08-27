/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigReadFsOptions } from '@authup/server-core';
import {
    CLI_CONFIG_ARGS,
    applyCLIConfigArgs,
    assertNoStrayPositionals,
    defineCLIConfigCommand,
    defineCLIHealthCheckCommand,
    defineCLIMigrationCommand,
    defineCLIStartCommand,
    defineCLIWorkerCommand,
} from '@authup/server-core';
import { defineCommand } from 'citty';
import fs from 'node:fs';
import path from 'node:path';
import { PACKAGE_PATH } from './path.ts';
import { buildApplicationMounts } from './roles/mounts.ts';

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
            config: defineCLIConfigCommand(configFs),
            healthcheck: defineCLIHealthCheckCommand(configFs),
            migration: defineCLIMigrationCommand(configFs),
            start: defineCLIStartCommand(configFs, { mounts: buildApplicationMounts }),
            worker: defineCLIWorkerCommand(configFs),
        },
        args: CLI_CONFIG_ARGS,
        setup(context) {
            assertNoStrayPositionals(context.args);
            applyCLIConfigArgs(configFs, context.args);
        },
    });
}
