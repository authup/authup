/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Container, deserializeKey } from '@authup/config';
import consola from 'consola';
import process from 'node:process';
import type { CAC } from 'cac';
import { executeAppCommand } from '../apps/execute';
import {
    AppCommand,
} from '../apps';

export function buildStartCommand(cac: CAC) {
    cac
        .command('start <service>', 'Start a service.')
        .option('-c, --config [config]', 'Specify a configuration file')
        .action(async (input: string, ctx: Record<string, any>) => {
            const keys = [
                'client/web',
                'server/core',
            ];
            const container = new Container({
                prefix: 'authup',
                keys,
            });

            const service = deserializeKey(input);
            if (keys.indexOf(`${service.group}/${service.name}`) === -1) {
                consola.error('The service is not supported for the start command.');
                process.exit(1);
            }

            if (ctx.config) {
                await container.loadFromFilePath(ctx.config);
            } else {
                await container.load();
            }

            await executeAppCommand({
                command: AppCommand.START,
                group: service.group,
                name: service.name,
                container,
            });
        });
}
