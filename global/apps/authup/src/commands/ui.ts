/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { read } from '@authup/config';
import type { CAC } from 'cac';
import chalk from 'chalk';
import consola from 'consola';
import { UICommand, buildClientWebConfig, startUI } from '../packages';

export function buildUiCommand(cac: CAC) {
    cac
        .command('ui <cmd>', 'Run a specific command')
        .option('-p, --port [port]', 'Specify the port for starting the application.')
        .option('-h, --host [host]', 'Specify the host for starting a specific application.')
        .option('-d, --apiUrl [apiUrl]', 'Specify the apiUrl of the backend application.')
        .action(async (command: string, ctx: Record<string, any>) => {
            const raw = await read();
            const config = await buildClientWebConfig(raw);

            let { apiUrl } = ctx;

            if (!apiUrl && config.apiUrl) {
                apiUrl = config.apiUrl;
            }

            if (!apiUrl) {
                apiUrl = config.publicUrl;
            }

            switch (command) {
                case UICommand.START: {
                    await startUI({
                        env: {
                            PORT: ctx.port || config.port,
                            HOST: ctx.host || config.host,
                            PUBLIC_URL: config.publicUrl,
                            API_URL: apiUrl,
                        },
                        envFromProcess: true,
                    });
                    break;
                }
                default: {
                    consola.warn(`The command ${chalk.red(command)} was not recognized.`);
                    break;
                }
            }
        });
}
