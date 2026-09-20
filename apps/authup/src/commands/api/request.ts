/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import { REMOTE_ARGS } from '../../remote/args.ts';
import { runRemoteRequest } from '../../remote/request.ts';

export function defineCLIAPIRequestCommand() {
    return defineCommand({
        meta: { name: 'request', description: 'Send an authenticated API request and print the JSON response.' },
        args: {
            path: {
                type: 'positional',
                required: true,
                description: 'API path with an optional query string.',
            },
            ...REMOTE_ARGS,
            method: {
                type: 'string',
                default: 'GET',
                alias: 'X',
                description: 'GET, HEAD, POST, PUT, PATCH, DELETE or OPTIONS.',
            },
            data: {
                type: 'string',
                alias: 'd',
                description: 'JSON request body.',
            },
        },
        async run({ args }) {
            if (args._.length > 1) {
                throw new Error('Expected one API path.');
            }
            await runRemoteRequest(args);
        },
    });
}
