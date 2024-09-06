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
import { executeServicesCommand } from '../services/execute';
import {
    PackageID,
    ServiceCommand,
} from '../services';

export function buildStartCommand(cac: CAC) {
    cac
        .command('start [...services]', 'Start a service')
        .option('-c, --config [config]', 'Specify a configuration file')
        .action(async (packages: string[], ctx: Record<string, any>) => {
            const packagesAvailable = Object.values(PackageID) as string[];
            for (let i = 0; i < packages.length; i++) {
                const isValid = packagesAvailable.indexOf(packages[i]) !== -1;
                if (!isValid) {
                    consola.error(`${chalk.red(`${packages[i]}`)}: The package does not exist.`);
                    process.exit(1);
                }
            }

            await executeServicesCommand({
                configFile: ctx.config,
                command: ServiceCommand.START,
                packages: packages as PackageID[],
            });
        });
}
