/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { PackageID, executePackageCommand, normalizePackageID } from './packages';

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
                required: false,
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
            let pkgs = ctx.args.package ?
                ctx.args.package.split(',') :
                [];

            pkgs = pkgs
                .map((pkg) => normalizePackageID(pkg))
                .filter((pkg) => Boolean(pkg));

            if (pkgs.length === 0) {
                pkgs = Object.values(PackageID);
            }

            const promises : Promise<ChildProcess>[] = [];
            for (let i = 0; i < pkgs.length; i++) {
                promises.push(executePackageCommand(
                    pkgs[i],
                    ctx.args.command,
                    {
                        configFile: ctx.args.configFile,
                        configDirectory: ctx.args.configDirectory,
                    },
                ));
            }

            await Promise.all(promises);
        },
    });
}
