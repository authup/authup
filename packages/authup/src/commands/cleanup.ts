/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CAC } from 'cac';
import chalk from 'chalk';
import consola from 'consola';
import process from 'node:process';
import { executeServicesCommand } from '../packages/execute';
import type { PackageID } from '../packages';
import { PackageCommand, isPackageValid } from '../packages';

export function buildCleanupCommand(cac: CAC) {
    cac
        .command('cleanup [...services]', 'Cleanup a service')
        .option('-cF, --configFile [configFile]', 'Specify a configuration file')
        .option('-cD, --configDirectory [configDirectory]', 'Specify a configuration directory')
        .action(async (packages: PackageID[], ctx: Record<string, any>) => {
            for (let i = 0; i < packages.length; i++) {
                if (!isPackageValid(packages[i])) {
                    consola.error(`${chalk.red(`${packages[i]}`)}: The package does not exist.`);
                    process.exit(1);
                }
            }

            await executeServicesCommand({
                configFile: ctx.configFile,
                configDirectory: ctx.configDirectory,
                command: PackageCommand.CLEANUP,
                packages,
            });
        });
}
