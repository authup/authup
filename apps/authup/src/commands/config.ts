/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    CONFIG_SCHEMA,
} from '@authup/server-config';
import {
    buildSchemaJSONSchema,
} from '@authup/server-config-kit';
import { defineCommand } from 'citty';

export function defineCLIConfigCommand() {
    return defineCommand({
        meta: {
            name: 'config',
            description: 'Inspect the configuration the service would read.',
        },
        subCommands: {
            schema: defineCommand({
                meta: {
                    name: 'schema',
                    description: 'Print the JSON Schema of the configuration file.',
                },
                run() {
                    const schema = buildSchemaJSONSchema(
                        CONFIG_SCHEMA,
                        { title: 'Authup configuration' },
                    );

                    // eslint-disable-next-line no-console
                    console.log(JSON.stringify(schema, null, 4));
                },
            }),
        },
    });
}
