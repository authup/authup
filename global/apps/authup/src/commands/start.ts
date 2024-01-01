/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Container } from '@authup/config';
import { parseAppID } from '@authup/core';
import chalk from 'chalk';
import consola from 'consola';
import process from 'node:process';
import type { CAC } from 'cac';
import { execute } from '../utils';
import {
    ServerCommand, createServerCommand, createWebAppStartCommand,
} from '../apps';

export function buildStartCommand(cac: CAC) {
    cac
        .command('start <service>', 'Start a service.')
        .option('-c, --config [config]', 'Specify a configuration file')
        .action(async (service: string, ctx: Record<string, any>) => {
            const root = process.cwd();
            const container = new Container();
            if (ctx.config) {
                await container.loadFromFilePath(ctx.config);
            } else {
                await container.load();
            }

            let command : string | undefined;

            const app = parseAppID(service);
            if (!app) {
                consola.error('Could not parse app name');
                process.exit(1);
            }

            if (app.group === 'server' && app.name === 'core') {
                command = createServerCommand(ServerCommand.START);
            }

            if (app.group === 'client' && app.name === 'web') {
                command = createWebAppStartCommand();
            }

            if (typeof command === 'undefined') {
                consola.error(`The app ${chalk.red(`${app.group}/${app.name}`)} can not be started.`);
                return;
            }

            await execute({
                command,
                env: {
                    CONFIG_FILE: ctx.config, // todo
                },
                logDataStream(line) {
                    consola.info(line);
                },
                logErrorStream(line) {
                    consola.warn(line);
                },
            });
        });
}
