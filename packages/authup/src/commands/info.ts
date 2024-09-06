/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CAC } from 'cac';
import consola from 'consola';
import {
    buildClientWebConfig, buildServerCoreConfig, readClientWebConfigRaw, readServerCoreConfig,
} from '../services';

export function buildInfoCommand(cac: CAC) {
    cac.command('info', 'Get information about the configuration.')
        .option('-c, --config [config]', 'Specify a configuration file')
        .action(async (ctx: Record<string, any>) => {
            const clientWebRaw = await readClientWebConfigRaw({
                fs: {
                    file: ctx.config,
                },
            });
            const clientWeb = buildClientWebConfig(clientWebRaw);

            consola.info(`Host: ${clientWeb.host}`);
            consola.info(`Port: ${clientWeb.port}`);
            consola.info('------------');

            const serverCoreRaw = await readServerCoreConfig({
                fs: {
                    file: ctx.config,
                },
            });
            const serverCore = await buildServerCoreConfig(serverCoreRaw);
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
