/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Container } from '@authup/config';
import type { CAC } from 'cac';
import consola from 'consola';
import { buildClientWebConfig, buildServerCoreConfig } from '../services';

export function buildInfoCommand(cac: CAC) {
    cac.command('info', 'Get information about the configuration.')
        .option('-c, --config [config]', 'Specify a configuration file')
        .action(async (ctx: Record<string, any>) => {
            const container = new Container({
                prefix: 'authup',
                keys: [
                    'client/web',
                    'server/core',
                ],
            });
            if (ctx.config) {
                await container.loadFromFilePath(ctx.config);
            } else {
                await container.load();
            }

            const clientWeb = await buildClientWebConfig(container);
            consola.info(`Host: ${clientWeb.host}`);
            consola.info(`Port: ${clientWeb.port}`);
            consola.info('------------');

            const serverCore = await buildServerCoreConfig();
            consola.info(`Host: ${serverCore.host}`);
            consola.info(`Port: ${serverCore.port}`);
            consola.info(`Environment: ${serverCore.env}`);
            consola.info(`RootPath: ${serverCore.rootPath}`);
            consola.info(`WritableDirectoryPath: ${serverCore.writableDirectoryPath}`);
            consola.info('------------');

            consola.info('Report an issue: https://github.com/authup/authup/issues/new');
            consola.info('Suggest an improvement: https://github.com/authup/authup/discussions/new');
            consola.info('Read documentation: https://authup.org');
        });
}
