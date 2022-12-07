/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CAC } from 'cac';
import { useConfig } from '../config';
import {
    startServer,
    startUI,
} from '../packages';

export function buildStartCommand(cac: CAC) {
    cac
        .command('start [...services]', 'Start one or many services.')
        .action(async (services: string[]) => {
            if (services.length === 0) {
                services = ['server', 'ui'];
            }

            const config = useConfig();

            if (services.indexOf('server') !== -1) {
                // todo: allow passing port and host
                await startServer();
            }

            if (services.indexOf('ui') !== -1) {
                await startUI({
                    port: config.ui.port,
                    host: config.ui.host,
                });
            }
        });
}
