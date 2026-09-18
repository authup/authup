/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { readServer } from './args.ts';
import { createRemoteClient, remoteError } from './client.ts';
import { resolveAPIPath } from './url.ts';
import {
    readSession,
    saveSession,
    sessionFromGrant,
    withSession,
} from './session/index.ts';
import type { RemoteRequestOptions } from './types.ts';

export async function runRemoteRequest(options: RemoteRequestOptions) : Promise<void> {
    const server = readServer(options.server);
    const url = resolveAPIPath(server, options.path);
    const method = (options.method || 'GET').toUpperCase();
    if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(method)) throw new Error('Unsupported HTTP method.');
    let body: string | undefined;
    if (options.data !== undefined) {
        if (method === 'GET' || method === 'HEAD') throw new Error(`${method} does not accept --data.`);
        try {
            JSON.parse(options.data);
            body = options.data;
        } catch {
            throw new Error('--data must contain valid JSON.');
        }
    }
    await withSession(server, options['credential-store'], async (store, signal) => {
        let session = await readSession(store, server);
        const client = createRemoteClient(server, signal);
        if (session.expiresAt <= Date.now() + 5000) {
            if (!session.refreshToken) throw new Error('The saved login expired. Run authup login again.');
            const grant = await client.token.createWithRefreshToken({
                client_id: session.clientId,
                refresh_token: session.refreshToken,
            }).catch(() => { throw new Error('Could not refresh the saved login. Run authup login again.'); });
            session = sessionFromGrant(server, session.clientId, grant, session.refreshToken);
            await saveSession(store, session);
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
}
