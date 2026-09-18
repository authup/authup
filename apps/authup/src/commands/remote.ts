/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import fs from 'node:fs/promises';
import { createRemoteClient, loginWithDeviceCode, remoteError } from '../remote/client.ts';
import {
    normalizeServer,
    readSession,
    resolveAPIPath,
    saveSession,
    sessionFromGrant,
    withSessionFile,
} from '../remote/session.ts';

const serverArg = {
    type: 'string' as const,
    description: 'API base URL (defaults to AUTHUP_SERVER_URL, then http://localhost:3000/).',
};

function readServer(server?: string) {
    return normalizeServer(server || process.env.AUTHUP_SERVER_URL || 'http://localhost:3000/');
}

export function defineCLILoginCommand() {
    return defineCommand({
        meta: { name: 'login', description: 'Sign in through the device authorization flow.' },
        args: {
            server: serverArg,
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
            await withSessionFile(server, async (file, signal) => {
                const client = createRemoteClient(server, signal);
                const grant = await loginWithDeviceCode(client, args['client-id'], signal, args.scope);
                await saveSession(file, sessionFromGrant(server, args['client-id'], grant));
            });
            // eslint-disable-next-line no-console
            console.error(`Logged in to ${server}`);
        },
    });
}

export function defineCLIAPICommand() {
    return defineCommand({
        meta: { name: 'api', description: 'Send an authenticated API request and print the JSON response.' },
        args: {
            path: {
                type: 'positional',
                required: true,
                description: 'API path with an optional query string.',
            },
            server: serverArg,
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
            if (args._.length > 1) throw new Error('Expected one API path.');
            const server = readServer(args.server);
            const url = resolveAPIPath(server, args.path);
            const method = args.method.toUpperCase();
            if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(method)) throw new Error('Unsupported HTTP method.');
            let body: string | undefined;
            if (args.data !== undefined) {
                if (method === 'GET' || method === 'HEAD') throw new Error(`${method} does not accept --data.`);
                try {
                    JSON.parse(args.data);
                    body = args.data;
                } catch {
                    throw new Error('--data must contain valid JSON.');
                }
            }
            await withSessionFile(server, async (file, signal) => {
                let session = await readSession(file, server);
                const client = createRemoteClient(server, signal);
                if (session.expiresAt <= Date.now() + 5000) {
                    if (!session.refreshToken) throw new Error('The saved login expired. Run authup login again.');
                    const grant = await client.token.createWithRefreshToken({
                        client_id: session.clientId,
                        refresh_token: session.refreshToken,
                    }).catch(() => { throw new Error('Could not refresh the saved login. Run authup login again.'); });
                    session = sessionFromGrant(server, session.clientId, grant, session.refreshToken);
                    await saveSession(file, session);
                }
                const response = await client.request({
                    url,
                    method,
                    body,
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                        Accept: 'application/json',
                        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
                    },
                }).catch((error) => { throw remoteError(error); });
                if (method !== 'HEAD' && response.status !== 204 && response.data !== undefined) {
                    // eslint-disable-next-line no-console
                    console.log(JSON.stringify(response.data, null, 2));
                }
            });
        },
    });
}

export function defineCLILogoutCommand() {
    return defineCommand({
        meta: { name: 'logout', description: 'Remove the saved local login for a server.' },
        args: { server: serverArg },
        async run({ args }) {
            if (args._.length > 0) throw new Error('Usage: authup logout [--server <url>]');
            const server = readServer(args.server);
            await withSessionFile(server, (file) => fs.rm(file, { force: true }));
            // eslint-disable-next-line no-console
            console.error(`Removed the local login for ${server}`);
        },
    });
}
