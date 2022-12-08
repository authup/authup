/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CAC } from 'cac';
import consola from 'consola';
import { createConfig } from '../config';

export function buildInfoCommand(cac: CAC) {
    cac.command('info', 'Get information about the configuration.')
        .action(async () => {
            const config = await createConfig();

            consola.info(`Environment: ${config.server.base.env}`);
            consola.info(`RootPath: ${config.server.base.rootPath}`);
            consola.info(`WritableDirectoryPath: ${config.server.base.writableDirectoryPath}`);
            consola.info(`UI Host: ${config.ui.host}`);
            consola.info(`UI Port: ${config.ui.port}`);
            consola.info(`Server Host: ${config.server.http.host}`);
            consola.info(`Server Port: ${config.server.http.port}`);
            consola.info('Report an issue: https://github.com/tada5hi/authup/issues/new');
            consola.info('Suggest an improvement: https://github.com/tada5hi/authup/discussions/new');
            consola.info('Read documentation: https://authup.org');
        });
}
