/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Container } from '@authup/config';
import process from 'node:process';
import type { CAC } from 'cac';
import { AppID } from '../constants';
import type { ApiStartCommandContext, UIStartCommandContext } from '../packages';
import {
    buildClientWebConfig,
    buildServerCoreConfig,
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
            const container = new Container();
            await container.load();

            if (services.indexOf(AppID.SERVER_CORE) !== -1) {
                const serverCore = await buildServerCoreConfig(container);
                const ctx : ApiStartCommandContext = {
                    args: {
                        root,
                    },
                    env: {
                        PORT: serverCore.port,
                        WRITABLE_DIRECTORY_PATH: serverCore.writableDirectoryPath,
                    },
                };

                await startServer(ctx);
            }

            if (services.indexOf(AppID.CLIENT_WEB) !== -1) {
                const clientWeb = await buildClientWebConfig(container);
                const ctx : UIStartCommandContext = {
                    args: {
                        root,
                    },
                    env: {
                        PORT: clientWeb.port,
                        HOST: clientWeb.host,
                        PUBLIC_URL: clientWeb.publicUrl,
                        API_URL: clientWeb.apiUrl,
                    },
                };

                await startUI(ctx);
            }
        });
}
