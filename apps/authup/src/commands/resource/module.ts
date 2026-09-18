/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import { REMOTE_ARGS } from '../../remote/args.ts';
import { runRemoteRequest } from '../../remote/request.ts';
import { RESOURCE_METHODS, RESOURCE_NAMES } from './constants.ts';

export function defineCLIResourceCommand() {
    return defineCommand({
        meta: { name: 'resource', description: 'List, read and modify API resources using the saved login.' },
        args: {
            resource: {
                type: 'positional',
                required: true,
                description: RESOURCE_NAMES.join(', '),
            },
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
            if (args._.length > 3) throw new Error('Unexpected resource argument.');
            if (!RESOURCE_NAMES.includes(args.resource)) throw new Error(`Unknown resource. Choose ${RESOURCE_NAMES.join(', ')}.`);
            if (!Object.hasOwn(RESOURCE_METHODS, args.operation)) throw new Error('Unknown operation. Use list, get, create, update or delete.');
            const needsId = ['get', 'update', 'delete'].includes(args.operation);
            if (needsId !== !!args.id) throw new Error(needsId ? 'This operation requires a record ID.' : 'This operation does not take a record ID.');
            if (args.id && (['.', '..'].includes(args.id) || /[\\/?#]/.test(args.id))) throw new Error('Invalid record ID.');
            const writes = args.operation === 'create' || args.operation === 'update';
            if (writes !== (args.data !== undefined)) throw new Error(writes ? 'This operation requires --data.' : 'This operation does not accept --data.');
            if (writes) {
                let data;
                try { data = JSON.parse(args.data!); } catch { throw new Error('--data must be a JSON object.'); }
                if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('--data must be a JSON object.');
            }
            if (args.query !== undefined && !['list', 'get'].includes(args.operation)) throw new Error('--query is only supported for list/get.');
            const query = args.query ? `?${new URLSearchParams(args.query)}` : '';
            await runRemoteRequest({
                server: args.server,
                'credential-store': args['credential-store'],
                path: `${args.resource}${args.id ? `/${encodeURIComponent(args.id)}` : ''}${query}`,
                method: RESOURCE_METHODS[args.operation as keyof typeof RESOURCE_METHODS],
                data: args.data,
            });
        },
    });
}
