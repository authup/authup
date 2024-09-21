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
import { executePackageCommand } from './packages';

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
        args: {
            command: {
                type: 'positional',
                description: 'The command which should be forwarded to the package.',
            },
            package: {
                type: 'positional',
                description: 'The package, which should be targeted.',
            },
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
        async run(ctx) {
            await executePackageCommand(
                ctx.args.package,
                ctx.args.command,
                {
                    configFile: ctx.args.configFile,
                    configDirectory: ctx.args.configDirectory,
                },
            );
        },
    });
}
