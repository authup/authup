/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigReadFsOptions } from '@authup/server-config';
import {
    CLI_CONFIG_ARGS,
    applyCLIConfigArgs,
    assertNoStrayPositionals,
    defineCLIMigrationCommand,
} from '@authup/server-core';
import { defineCommand } from 'citty';
import fs from 'node:fs';
import path from 'node:path';
import { PACKAGE_PATH } from './path.ts';
import {
    defineCLIConfigCommand,
    defineCLIDevCommand,
    defineCLIHealthCheckCommand,
    defineCLIStartCommand,
} from './commands/index.ts';

export async function createCLIEntryPointCommand() {
    const pkgRaw = await fs.promises.readFile(
        path.join(PACKAGE_PATH, 'package.json'),
        { encoding: 'utf8' },
    );
    const pkg = JSON.parse(pkgRaw);

    // untyped on purpose: these options travel to every service, and each
    // reads its own selection of the document.
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

            // One listener verb with a positional role: bare for the
            // single container, `core`, `worker` or `console [name]` for
            // the split deployment.
            start: defineCLIStartCommand(configFs),

            // `start`, but a console whose package resolves to a source
            // checkout is served through vite instead of its built dist.
            dev: defineCLIDevCommand(configFs),
        },
        args: {
            ...CLI_CONFIG_ARGS,
            // Declared on `start` as well: citty parses an undeclared flag as
            // a boolean nobody reads, and a flag placed BEFORE the subcommand
            // (`authup --worker start`) never reaches the subcommand's parse.
            worker: {
                type: 'boolean',
                description: 'Retired. Use `authup start worker`.',
            },
        },
        setup(context) {
            if (context.args.worker) {
                throw new Error('The --worker flag is retired. Use `authup start worker`.');
            }

            // `dev` is the one command here that takes no positional at all;
            // `start` takes a role and validates it itself.
            assertNoStrayPositionals(context.args, new Set(['dev']));
            applyCLIConfigArgs(configFs, context.args);
        },
    });
}
