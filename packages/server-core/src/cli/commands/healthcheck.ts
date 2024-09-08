/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import http from 'node:http';
import process from 'node:process';
import { useConfig } from '../../config';

export function defineCLIHealthCheckCommand() {
    return defineCommand({
        meta: {
            name: 'healthcheck',
        },
        async setup() {
            const config = useConfig();

            const healthCheck = http.request(
                {
                    path: '/metrics',
                    host: '0.0.0.0',
                    port: config.port,
                    timeout: 2000,
                },
                (res) => {
                    if (res.statusCode === 200) {
                        process.exit(0);
                    } else {
                        process.exit(1);
                    }
                },
            );

            healthCheck.on('error', () => {
                process.exit(1);
            });

            healthCheck.end();
        },
    });
}
