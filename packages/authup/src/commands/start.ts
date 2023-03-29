/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CAC } from 'cac';
import process from 'node:process';
import { createConfig } from '../config';
import {
    startServer, startUI,
} from '../packages';

export function buildStartCommand(cac: CAC) {
    cac
        .command('start [...services]', 'Start one or many services.')
        .action(async (services: string[]) => {
            if (services.length === 0) {
                services = ['server', 'ui'];
            }

            const config = await createConfig();
            const root = process.cwd();

            if (services.indexOf('server') !== -1) {
                await startServer({
                    env: {
                        root,
                    },
                });
            }

            if (services.indexOf('ui') !== -1) {
                await startUI({
                    env: {
                        port: config.ui.get('port'),
                        host: config.ui.get('host'),
                        apiUrl: config.api.get('publicUrl'),
                    },
                });
            }
        });
}
