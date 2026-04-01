/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import process from 'node:process';
import { Swagger } from '../../adapters/http/index.ts';
import { ApplicationBuilder, ConfigInjectionKey } from '../../app/index.ts';

export function defineCLISwaggerCommand() {
    return defineCommand({
        meta: { name: 'swagger' },
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
            const app = new ApplicationBuilder()
                .withConfig()
                .build();

            await app.setup();

            const config = app.container.resolve(ConfigInjectionKey);

            const swagger = new Swagger({ baseURL: config.publicUrl });

            if (context.args.operation === 'generate') {
                await swagger.generate();
            }

            process.exit(0);
        },
    });
}
