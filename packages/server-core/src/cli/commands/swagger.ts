/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import process from 'node:process';
import { useConfig } from '../../config';
import { Swagger } from '../../http';

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
            const config = useConfig();

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
