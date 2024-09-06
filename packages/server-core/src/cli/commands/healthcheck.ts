/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import http from 'node:http';
import process from 'node:process';
import type { Arguments, Argv, CommandModule } from 'yargs';
import { buildConfig, readConfigRaw } from '../../config';

interface HealthCheckArguments extends Arguments {
    configDirectory: string | undefined;
    configFile: string | undefined;
}

export class HealthCheckCommand implements CommandModule {
    command = 'healthcheck';

    describe = 'Check if the server is up and running.';

    builder(args: Argv) {
        return args
            .option('configDirectory', {
                alias: 'cD',
                describe: 'Config directory path.',
            })
            .option('configFile', {
                alias: 'cF',
                describe: 'Name of one or more configuration files.',
            });
    }

    async handler(args: HealthCheckArguments) {
        const raw = await readConfigRaw({
            env: true,
            fs: {
                cwd: args.configDirectory,
                file: args.configFile,
            },
        });
        const config = buildConfig(raw);

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
    }
}
