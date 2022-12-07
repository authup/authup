/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CAC } from 'cac';
import consola from 'consola';
import chalk from 'chalk';
import { ServerCommand, executeServerCommand, startServer } from '../packages';
import { resetServer } from '../packages/server/commands/reset';

export function buildServerCommand(cac: CAC) {
    cac.command('server <cmd>', 'Run a specific command.')
        .action(async (command :string) => {
            switch (command) {
                case ServerCommand.START: {
                    await startServer();
                    break;
                }
                case ServerCommand.RESET: {
                    await resetServer();
                    break;
                }
                default: {
                    consola.warn(`The command ${chalk.red(command)} was not recognized.`);
                    break;
                }
            }
        });
}
