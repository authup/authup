/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CAC } from 'cac';
import consola from 'consola';
import chalk from 'chalk';
import process from 'node:process';
import { createConfig } from '../config';
import {
    ServerCommand, resetServer, startServer,
} from '../packages';

export function buildServerCommand(cac: CAC) {
    cac.command('api <cmd>', 'Run a specific command.')
        .action(async (command :string) => {
            const root = process.cwd();
            const config = await createConfig();

            switch (command) {
                case ServerCommand.START: {
                    await startServer({
                        args: {
                            root,
                        },
                        env: {
                            PORT: config.api.get('port'),
                            WRITABLE_DIRECTORY_PATH: config.api.get('writableDirectoryPath'),
                        },
                        envFromProcess: true,
                    });
                    break;
                }
                case ServerCommand.RESET: {
                    await resetServer({
                        args: {
                            root,
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
