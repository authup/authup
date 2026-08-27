/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import http from 'node:http';
import process from 'node:process';
import type { AuthupConfig, ConfigReadFsOptions } from '@authup/server-config';
import { CONFIG_SCHEMA, readConfigFileTree  } from '@authup/server-config';
import { buildSchemaDefaults, readSchemaFromEnv, readSchemaFromFileTree } from '@authup/server-config-kit';

export function defineCLIHealthCheckCommand(options: ConfigReadFsOptions<AuthupConfig> = {}) {
    return defineCommand({
        meta: { name: 'healthcheck' },
        async setup() {
            const { tree } = await readConfigFileTree(options);
            const config = {
                ...readSchemaFromFileTree(tree, CONFIG_SCHEMA),
                ...readSchemaFromEnv(CONFIG_SCHEMA),
                ...buildSchemaDefaults(CONFIG_SCHEMA),
            };

            const healthCheck = http.request(
                {
                    path: '/',
                    host: '0.0.0.0',
                    port: config.port || 3000,
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
