/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasProcessEnv, readFromProcessEnv, readIntFromProcessEnv } from '@authup/server-common';
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

            const config = await createConfig();

            if (services.indexOf(ServiceName.API) !== -1) {
                const ctx : ApiStartCommandContext = {
                    env: {
                        PORT: config.api.get('port'),
                        WRITABLE_DIRECTORY_PATH: config.api.get('writableDirectoryPath'),
                    },
                };

                if (hasProcessEnv('API_PORT')) {
                    ctx.env.PORT = readIntFromProcessEnv('API_PORT');
                }

                if (hasProcessEnv('WRITABLE_DIRECTORY_PATH')) {
                    ctx.env.WRITABLE_DIRECTORY_PATH = readFromProcessEnv('WRITABLE_DIRECTORY_PATH');
                }

                await startServer(ctx);
            }

            if (services.indexOf(ServiceName.UI) !== -1) {
                const ctx : UIStartCommandContext = {
                    env: {
                        NUXT_PORT: config.ui.get('port'),
                        NUXT_HOST: config.ui.get('host'),
                        NUXT_API_URL: config.api.get('publicUrl'),
                    },
                };

                if (hasProcessEnv('UI_PORT')) {
                    ctx.env.NUXT_PORT = readIntFromProcessEnv('UI_PORT');
                }

                await startUI(ctx);
            }
        });
}
