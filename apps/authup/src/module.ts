/*
 * Copyright (c) 2024-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { normalizeError } from '@authup/errors';
import { defineCommand } from 'citty';
import consola from 'consola';
import { read } from 'locter';
import path from 'node:path';
import process from 'node:process';
import { buildServerCoreEnv, readLauncherConfig } from './config';
import { PACKAGE_DIRECTORY } from './constants';
import {
    PACKAGE_BIN_NAME_MAP,
    PACKAGE_NAME_MAP,
    buildPackageProcessArgv,
    resolveLaunchPlan,
    resolvePackageEntrypoint,
} from './packages';
import type { LaunchPlan } from './packages';
import { superviseProcesses } from './supervisor';
import type { SupervisedChildSpec } from './supervisor';

export async function createCLIEntryPointCommand() {
    const pkg : {
        name?: string,
        version?: string,
        description?: string,
    } = await read(path.join(PACKAGE_DIRECTORY, 'package.json'));

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
                description: 'The package(s) to target (server.core) or arguments forwarded to the command.',
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
                consola.error(normalizeError(error).message);
                process.exit(1);
            }

            const config = await readLauncherConfig({
                directory: ctx.args.configDirectory,
                file: ctx.args.configFile,
            });

            for (const warning of [...plan.warnings, ...config.warnings]) {
                consola.warn(warning);
            }

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
                    pkg.version,
                );

                children.push({
                    id: packageId,
                    ...buildPackageProcessArgv(entrypoint, [...plan.commandArgs, ...configArgs]),
                    env: buildServerCoreEnv(config),
                });
            }

            const exitCode = await superviseProcesses(children);

            process.exit(exitCode);
        },
    });
}
