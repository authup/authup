/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { read } from '@authup/config';
import type { CAC } from 'cac';
import consola from 'consola';
import { buildClientWebConfig, buildServerCoreConfig } from '../packages';

export function buildInfoCommand(cac: CAC) {
    cac.command('info', 'Get information about the configuration.')
        .action(async () => {
            const raw = await read();
            const serverCore = await buildServerCoreConfig(raw);
            const clientWeb = await buildClientWebConfig(raw);

            consola.info(`Environment: ${serverCore.env}`);
            consola.info(`RootPath: ${serverCore.rootPath}`);
            consola.info(`WritableDirectoryPath: ${serverCore.writableDirectoryPath}`);
            consola.info(`UI Host: ${clientWeb.host}`);
            consola.info(`UI Port: ${clientWeb.port}`);
            consola.info(`Server Host: ${serverCore.host}`);
            consola.info(`Server Port: ${serverCore.port}`);
            consola.info('Report an issue: https://github.com/authup/authup/issues/new');
            consola.info('Suggest an improvement: https://github.com/authup/authup/discussions/new');
            consola.info('Read documentation: https://authup.org');
        });
}
