/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CAC } from 'cac';
import consola from 'consola';
import { createConfig } from '../config';

export function buildInfoCommand(cac: CAC) {
    cac.command('info', 'Get information about the configuration.')
        .action(async () => {
            const config = await createConfig();

            consola.info(`Environment: ${config.api.get('env')}`);
            consola.info(`RootPath: ${config.api.get('rootPath')}`);
            consola.info(`WritableDirectoryPath: ${config.api.get('writableDirectoryPath')}`);
            consola.info(`UI Host: ${config.ui.get('host')}`);
            consola.info(`UI Port: ${config.ui.get('port')}`);
            consola.info(`Server Host: ${config.api.get('host')}`);
            consola.info(`Server Port: ${config.api.get('port')}`);
            consola.info('Report an issue: https://github.com/authup/authup/issues/new');
            consola.info('Suggest an improvement: https://github.com/authup/authup/discussions/new');
            consola.info('Read documentation: https://authup.org');
        });
}
