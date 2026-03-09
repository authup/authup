/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import consola from 'consola';
import path from 'node:path';
import type { ShellCommandExecOptions } from '../../utils';
import { execShellCommand, findModulePath } from '../../utils';
import { PackageID, PackageName } from '../constants';
import type { Package, PackageExecuteOptions } from '../types';

export class ServerCorePackage implements Package {
    async execute(command: string, options: PackageExecuteOptions = {}) {
        const shellCommand = await this.buildShellCommand(command, {
            configDirectory: options.configDirectory,
            configFile: options.configFile,
        });

        return execShellCommand(shellCommand, {
            logDataStream(line) {
                consola.info(`${PackageID.SERVER_CORE}: ${line}`);
            },
            logErrorStream(line) {
                consola.warn(`${PackageID.SERVER_CORE}: ${line}`);
            },
        });
    }

    protected async buildShellCommand(command: string, options: ShellCommandExecOptions) {
        const parts : string[] = [];

        const modulePath = findModulePath(PackageName.SERVER_CORE);
        if (typeof modulePath === 'string') {
            const directory = path.dirname(modulePath);
            const outputPath = path.join(directory, 'dist', 'cli', 'index.js');
            parts.push(`node ${outputPath}`);
        } else {
            parts.push(`npx ${PackageName.SERVER_CORE}`);
        }

        parts.push(command);

        if (options.configFile) {
            parts.push(`--configFile=${options.configFile}`);
        }

        if (options.configDirectory) {
            parts.push(`--configDirectory=${options.configDirectory}`);
        }

        return parts.join(' ');
    }
}
