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
import { SCHEMA, readConfigFileTree  } from '@authup/server-config';
import {
    buildSchemaDefaults,
    mergeSchemaData,
    readSchemaFromEnv,
    readSchemaFromFileTree,
} from '@authup/server-config-kit';
import { buildInternalUrl } from '../console/api-url.ts';

export function defineCLIHealthCheckCommand(options: ConfigReadFsOptions<AuthupConfig> = {}) {
    return defineCommand({
        meta: { name: 'healthcheck', description: 'Probe the API listener and exit non-zero when it does not answer.' },
        async setup() {
            const { tree } = await readConfigFileTree(options);
            const config = mergeSchemaData<AuthupConfig>(
                SCHEMA,
                buildSchemaDefaults<AuthupConfig>(SCHEMA),
                readSchemaFromFileTree<AuthupConfig>(tree, SCHEMA),
                readSchemaFromEnv<AuthupConfig>(SCHEMA),
            ) as AuthupConfig;

            // `core.host` inherits the deployment-wide `host` (HOST) through
            // its `resolve`, which this command deliberately does not run: the
            // full resolver would let an unrelated cross-key invariant (a
            // console url on a foreign origin, a short SECRETS_ENCRYPTION_KEY)
            // fail the probe for the wrong reason. So the one fallback is
            // spelled here, and a wildcard bind is looped back the way the
            // composed roles reach their own listener.
            const healthCheck = http.request(
                buildInternalUrl(config.core.host || config.defaultHost, config.core.port),
                { timeout: 2000 },
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
