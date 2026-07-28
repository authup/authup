/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import consola from 'consola';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
    buildClientWebEnv,
    buildServerCoreEnv,
    readLauncherConfig,
} from './config';
import { PACKAGE_DIRECTORY } from './constants';
import {
    PACKAGE_BIN_NAME_MAP,
    PACKAGE_NAME_MAP,
    PackageID,
    buildPackageProcessArgv,
    resolveLaunchPlan,
    resolvePackageEntrypoint,
} from './packages';
import type { LaunchPlan } from './packages';
import { superviseProcesses } from './supervisor';
import type { SupervisedChildSpec } from './supervisor';

export async function createCLIEntryPointCommand() {
    const pkgRaw = await fs.promises.readFile(
        path.join(PACKAGE_DIRECTORY, 'package.json'),
        { encoding: 'utf8' },
    );
    const pkg = JSON.parse(pkgRaw) as {
        name?: string,
        version?: string,
        description?: string,
    };

    return defineCommand({
        meta: {
            name: pkg.name,
            version: pkg.version,
            description: pkg.description,
        },
        args: {
            command: {
                type: 'positional',
                description: 'The command to run (start, migration, healthcheck).',
                required: true,
            },
            package: {
                type: 'positional',
                description: 'The package(s) to target (client.web, server.core) or arguments forwarded to the command.',
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
            const rest = ctx.args._.slice(1);

            // An unsupported command / package selector is user error: report
            // the message and stop, instead of letting citty print a stack.
            let plan : LaunchPlan;
            try {
                plan = resolveLaunchPlan(ctx.args.command, rest);
            } catch (error) {
                consola.error(error instanceof Error ? error.message : error);
                process.exit(1);
            }

            const config = await readLauncherConfig({
                directory: ctx.args.configDirectory,
                file: ctx.args.configFile,
            });

            const configArgs : string[] = [];
            if (ctx.args.configFile) {
                configArgs.push(`--configFile=${ctx.args.configFile}`);
            }

            if (ctx.args.configDirectory) {
                configArgs.push(`--configDirectory=${ctx.args.configDirectory}`);
            }

            const lookupDirectories = [PACKAGE_DIRECTORY, process.cwd()];

            const children : SupervisedChildSpec[] = [];
            for (const packageId of plan.packages) {
                const entrypoint = await resolvePackageEntrypoint(
                    PACKAGE_NAME_MAP[packageId],
                    PACKAGE_BIN_NAME_MAP[packageId],
                    lookupDirectories,
                );

                if (packageId === PackageID.SERVER_CORE) {
                    children.push({
                        id: packageId,
                        ...buildPackageProcessArgv(entrypoint, [...plan.commandArgs, ...configArgs]),
                        env: buildServerCoreEnv(config),
                    });
                } else {
                    children.push({
                        id: packageId,
                        ...buildPackageProcessArgv(entrypoint, []),
                        env: buildClientWebEnv(config),
                    });
                }
            }

            const exitCode = await superviseProcesses(children);

            process.exit(exitCode);
        },
    });
}
