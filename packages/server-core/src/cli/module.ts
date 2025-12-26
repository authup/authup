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
import { normalizeConfig } from '../app/modules/config/normalize.ts';
import { readConfigRaw } from '../app/modules/config/read/index.ts';
import {
    defineCLIHealthCheckCommand,
    defineCLIMigrationCommand,
    defineCLIResetCommand,
    defineCLIStartCommand,
    defineCLISwaggerCommand,
} from './commands/index.ts';

export async function createCLIEntryPointCommand() {
    const pkgRaw = await fs.promises.readFile(
        path.join(process.cwd(), 'package.json'),
        { encoding: 'utf8' },
    );
    const pkg = JSON.parse(pkgRaw);

    return defineCommand({
        meta: {
            name: pkg.name,
            version: pkg.version,
            description: pkg.description,
        },
        subCommands: {
            healthcheck: defineCLIHealthCheckCommand(),
            migration: defineCLIMigrationCommand(),
            reset: defineCLIResetCommand(),
            start: defineCLIStartCommand(),
            swagger: defineCLISwaggerCommand(),
        },
        args: {
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
        },
        async setup(context) {
            const raw = await readConfigRaw({
                env: true,
                fs: {
                    cwd: context.args.configDirectory,
                    file: context.args.configFile,
                },
            });

            normalizeConfig(raw);
        },
    });
}
