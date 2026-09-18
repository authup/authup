/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import { REMOTE_ARGS, readServer } from '../remote/args.ts';
import { createRemoteClient, loginWithDeviceCode } from '../remote/client.ts';
import { saveSession, sessionFromGrant, withSession } from '../remote/session/index.ts';

export function defineCLILoginCommand() {
    return defineCommand({
        meta: { name: 'login', description: 'Sign in through the device authorization flow.' },
        args: {
            ...REMOTE_ARGS,
            'client-id': {
                type: 'string',
                required: true,
                description: 'Public client UUID with the device grant enabled.',
            },
            scope: { type: 'string', description: 'Space-separated OAuth2 scopes.' },
        },
        async run({ args }) {
            if (args._.length > 0 || !args['client-id'].trim()) throw new Error('Usage: authup login --client-id <id> [--server <url>]');
            const server = readServer(args.server);
            await withSession(server, args['credential-store'], async (store, signal) => {
                await store.read();
                const client = createRemoteClient(server, signal);
                const grant = await loginWithDeviceCode(client, args['client-id'], signal, args.scope);
                await saveSession(store, sessionFromGrant(server, args['client-id'], grant));
            });
            // eslint-disable-next-line no-console
            console.error(`Logged in to ${server}`);
        },
    });
}
