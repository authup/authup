/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import process from 'node:process';
import type { CAC } from 'cac';
import { createConfig } from '../config';
import { AppID } from '../constants';
import type { ApiStartCommandContext, UIStartCommandContext } from '../packages';
import {
    startServer,
    startUI,
} from '../packages';

export function buildStartCommand(cac: CAC) {
    cac
        .command('start [...services]', 'Start one or many services.')
        .action(async (services: string[]) => {
            if (services.length === 0) {
                services = Object.values(AppID);
            }

            const root = process.cwd();
            const config = await createConfig();

            if (services.indexOf(AppID.SERVER_CORE) !== -1) {
                const ctx : ApiStartCommandContext = {
                    args: {
                        root,
                    },
                    env: {
                        PORT: config.api.port,
                        WRITABLE_DIRECTORY_PATH: config.api.writableDirectoryPath,
                    },
                };

                await startServer(ctx);
            }

            if (services.indexOf(AppID.CLIENT_WEB) !== -1) {
                const ctx : UIStartCommandContext = {
                    args: {
                        root,
                    },
                    env: {
                        PORT: config.ui.port,
                        HOST: config.ui.host,
                        PUBLIC_URL: config.ui.publicUrl,
                        API_URL: config.ui.apiUrl ?
                            config.ui.apiUrl :
                            config.api.publicUrl,
                    },
                };

                await startUI(ctx);
            }
        });
}
