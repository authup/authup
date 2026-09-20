/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import { REMOTE_ARGS } from '../../remote/args.ts';
import { runRemoteRequest } from '../../remote/request.ts';
import { RESOURCE_METHODS } from './constants.ts';
import { validateResourceArguments } from './validation.ts';

export function defineCLIResourceCommand(resource: string) {
    return defineCommand({
        meta: { name: resource, description: `List, read and modify ${resource} using the saved login.` },
        args: {
            operation: {
                type: 'positional',
                required: true,
                description: 'list, get, create, update or delete',
            },
            id: {
                type: 'positional',
                required: false,
                description: 'Record ID (required for get, update and delete).',
            },
            ...REMOTE_ARGS,
            query: { type: 'string', description: 'URL query string for list/get, e.g. page[limit]=10.' },
            data: {
                type: 'string',
                alias: 'd',
                description: 'JSON object for create/update.',
            },
        },
        async run({ args }) {
            const operation = validateResourceArguments(args);

            let resourcePath = resource;
            if (args.id) {
                resourcePath += `/${encodeURIComponent(args.id)}`;
            }

            if (args.query) {
                resourcePath += `?${new URLSearchParams(args.query)}`;
            }

            await runRemoteRequest({
                server: args.server,
                'credential-store': args['credential-store'],
                path: resourcePath,
                method: RESOURCE_METHODS[operation],
                data: args.data,
            });
        },
    });
}
