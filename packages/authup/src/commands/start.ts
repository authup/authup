/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import process from 'node:process';
import type { CAC } from 'cac';
import { createConfig } from '../config';
import type { ApiStartCommandContext, UIStartCommandContext } from '../packages';
import {
    ServiceName,
    startServer,
    startUI,
} from '../packages';

export function buildStartCommand(cac: CAC) {
    cac
        .command('start [...services]', 'Start one or many services.')
        .action(async (services: string[]) => {
            if (services.length === 0) {
                services = Object.values(ServiceName);
            }

            const root = process.cwd();
            const config = await createConfig();

            if (services.indexOf(ServiceName.API) !== -1) {
                const ctx : ApiStartCommandContext = {
                    args: {
                        root,
                    },
                    env: {
                        PORT: config.api.get('port'),
                        WRITABLE_DIRECTORY_PATH: config.api.get('writableDirectoryPath'),
                    },
                };

                await startServer(ctx);
            }

            if (services.indexOf(ServiceName.UI) !== -1) {
                const ctx : UIStartCommandContext = {
                    args: {
                        root,
                    },
                    env: {
                        PORT: config.ui.get('port'),
                        HOST: config.ui.get('host'),
                        PUBLIC_URL: config.ui.get('publicUrl'),
                        API_URL: config.ui.has('apiUrl') ?
                            config.ui.get('apiUrl') :
                            config.api.get('publicUrl'),
                    },
                };

                await startUI(ctx);
            }
        });
}
