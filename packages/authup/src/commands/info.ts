/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CAC } from 'cac';
import consola from 'consola';
import {
    buildClientWebConfig,
    buildServerCoreConfig,
    readClientWebConfigRaw,
    readServerCoreConfig,
} from '../packages';

export function buildInfoCommand(cac: CAC) {
    cac.command('info', 'Get information about the configuration.')
        .option('-cF, --configFile [configFile]', 'Specify a configuration file')
        .option('-cD, --configDirectory [configDirectory]', 'Specify a configuration directory')
        .action(async (ctx: Record<string, any>) => {
            const serverCoreRaw = await readServerCoreConfig({
                fs: {
                    file: ctx.configFile,
                    cwd: ctx.configDirectory,
                },
            });
            const serverCore = await buildServerCoreConfig(serverCoreRaw);

            consola.info(`Environment: ${serverCore.env}`);
            consola.info(`RootPath: ${serverCore.rootPath}`);
            consola.info(`WritableDirectoryPath: ${serverCore.writableDirectoryPath}`);

            consola.info('-'.repeat(50));

            consola.info(`[server.core] Host: ${serverCore.host}`);
            consola.info(`[server.core] Port: ${serverCore.port}`);

            consola.info('-'.repeat(50));

            const clientWebRaw = await readClientWebConfigRaw({
                fs: {
                    file: ctx.configFile,
                    cwd: ctx.configDirectory,
                },
            });
            const clientWeb = buildClientWebConfig(clientWebRaw);

            consola.info(`[client.web] Host: ${clientWeb.host}`);
            consola.info(`[client.web] Port: ${clientWeb.port}`);

            consola.info('-'.repeat(50));

            consola.info('Report an issue: https://github.com/authup/authup/issues/new');
            consola.info('Suggest an improvement: https://github.com/authup/authup/discussions/new');
            consola.info('Read documentation: https://authup.org');
        });
}
