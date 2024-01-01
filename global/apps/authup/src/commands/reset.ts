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
import { AppCommand } from '../apps';

export function buildResetCommand(cac: CAC) {
    cac
        .command('reset <service>', 'Reset a service.')
        .option('-c, --config [config]', 'Specify a configuration file')
        .action(async (serviceKey: string, ctx: Record<string, any>) => {
            const keys = ['server/core'];
            const service = deserializeKey(serviceKey);

            if (keys.indexOf(`${service.group}/${service.name}`) === -1) {
                consola.error('The service is not supported for the reset command.');
                process.exit(1);
            }

            const container = new Container({
                prefix: 'authup',
                keys,
            });

            if (ctx.config) {
                await container.loadFromFilePath(ctx.config);
            } else {
                await container.load();
            }

            await executeAppCommand({
                command: AppCommand.RESET,
                group: service.group,
                name: service.name,
                container,
            });
        });
}
