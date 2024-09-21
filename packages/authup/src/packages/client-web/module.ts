/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import consola from 'consola';
import type { ChildProcess } from 'node:child_process';
import path from 'node:path';
import { execShellCommand, findModulePath } from '../../utils';
import { PackageID, PackageName } from '../constants';
import type { Package, PackageExecuteOptions } from '../types';
import { buildClientWebConfig, readClientWebConfigRaw } from './config';

export class ClientWebPackage implements Package {
    async execute(command: string, options: PackageExecuteOptions = {}) : Promise<ChildProcess> {
        const shellCommand = await this.buildShellCommand();
        const env = await this.buildEnv({
            configDirectory: options.configDirectory,
            configFile: options.configFile,
        });

        return execShellCommand(shellCommand, {
            env,
            logDataStream(line) {
                consola.info(`${PackageID.CLIENT_WEB}: ${line}`);
            },
            logErrorStream(line) {
                consola.warn(`${PackageID.CLIENT_WEB}: ${line}`);
            },
        });
    }

    protected async buildShellCommand() {
        let shellCommand : string;

        const modulePath = findModulePath(PackageName.CLIENT_WEB);
        if (typeof modulePath === 'string') {
            const directory = path.dirname(modulePath);
            const outputPath = path.join(directory, '.output', 'server', 'index.mjs');
            shellCommand = `node ${outputPath}`;
        } else {
            shellCommand = `npx ${PackageName.CLIENT_WEB}`;
        }

        return shellCommand;
    }

    protected async buildEnv(ctx: PackageExecuteOptions) {
        const env : Record<string, any> = {};

        const configRaw = await readClientWebConfigRaw({
            fs: {
                file: ctx.configFile,
                cwd: ctx.configDirectory,
            },
        });
        const config = buildClientWebConfig(configRaw);

        if (config.host) {
            env.HOST = config.host;
        }

        if (config.port) {
            env.PORT = `${config.port}`;
        }

        if (config.apiUrl) {
            env.API_URL = config.apiUrl;
        }

        if (config.publicUrl) {
            env.PUBLIC_URL = config.publicUrl;
        }

        return this.extendEnvKeys(env);
    }

    extendEnvKeys(input: Record<string, string | undefined>) {
        const env : Record<string, any> = {};

        const keys = Object.keys(input);
        for (let i = 0; i < keys.length; i++) {
            env[keys[i]] = input[keys[i]];

            if (!keys[i].match(/^(?:NUXT|NITRO)_.*$/)) {
                env[`NUXT_PUBLIC_${keys[i]}`] = input[keys[i]];
            }
        }

        return env;
    }
}
