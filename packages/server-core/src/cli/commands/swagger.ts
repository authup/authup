/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import process from 'node:process';
import type { Config } from '../../app';
import { Swagger } from '../../adapters/http';
import { Application, ConfigInjectionKey, ConfigModule } from '../../app';

export function defineCLISwaggerCommand() {
    return defineCommand({
        meta: {
            name: 'swagger',
        },
        args: {
            operation: {
                required: true,
                type: 'positional',
                options: [
                    'generate',
                ],
            },
        },
        async setup(context) {
            const app = new Application([
                new ConfigModule(),
            ]);

            await app.start();

            const config = app.container.resolve<Config>(ConfigInjectionKey);

            const swagger = new Swagger({
                baseURL: config.publicUrl,
            });

            if (context.args.operation === 'generate') {
                await swagger.generate();
            }

            process.exit(0);
        },
    });
}
