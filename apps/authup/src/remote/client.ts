/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from '@authup/core-http-kit';
import { ErrorCode } from '@authup/errors';
import { isOAuth2DeviceAuthorizationError } from '@authup/specs';
import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { HookName, isClientError } from 'hapic';
import { setTimeout } from 'node:timers/promises';

export function createRemoteClient(server: string, signal: AbortSignal) : Client {
    const client = new Client({ baseURL: server, redirect: 'error' });
    client.on(HookName.REQUEST, (request) => {
        signal.throwIfAborted();
        request.signal = AbortSignal.any([signal, AbortSignal.timeout(30000)]);
        return request;
    });
    return client;
}

export function remoteError(error: unknown) : Error {
    // Never give citty a transport error: its request contains credentials.
    if (isClientError(error)) {
        const body = error.response?.data;
        const code = body?.data?.error ?? body?.error;
        if (['expired_token', 'access_denied', 'invalid_grant', 'invalid_client', 'unauthorized_client', 'invalid_scope'].includes(code)) {
            return new Error(`Authorization failed (${code}). Check the client configuration and run authup login again.`);
        }
        return new Error(error.response ?
            `Request failed (HTTP ${error.response.status}). Check the request and your login.` :
            'Could not reach the server (network error, timeout or refused redirect).');
    }
    return new Error('The server request failed.');
}

export async function loginWithDeviceCode(client: Client, clientId: string, signal: AbortSignal, scope?: string) : Promise<OAuth2TokenGrantResponse> {
    const device = await client.deviceAuthorization.create({ client_id: clientId, scope })
        .catch((error) => { throw remoteError(error); });
    if (!device.device_code || !device.user_code || !device.verification_uri_complete ||
        !Number.isFinite(device.interval) || device.interval <= 0 ||
        !Number.isFinite(device.expires_in) || device.expires_in <= 0) {
        throw new Error('The server returned an invalid device authorization response.');
    }
    // eslint-disable-next-line no-console
    console.error(`Open ${device.verification_uri_complete}`);
    // eslint-disable-next-line no-console
    console.error(`Enter code: ${device.user_code}`);
    const deadline = Date.now() + device.expires_in * 1000;
    let interval = device.interval * 1000;
    while (Date.now() < deadline) {
        await setTimeout(Math.min(interval, deadline - Date.now()), undefined, { signal });
        if (Date.now() >= deadline) break;
        try {
            return await client.token.createWithDeviceCode({ client_id: clientId, device_code: device.device_code });
        } catch (error) {
            const body = isClientError(error) ? error.response?.data : error;
            if (isOAuth2DeviceAuthorizationError(body)) {
                if (body.code === ErrorCode.OAUTH_AUTHORIZATION_PENDING) continue;
                if (body.code === ErrorCode.OAUTH_SLOW_DOWN) {
                    interval += 5000;
                    continue;
                }
            }
            throw remoteError(error);
        }
    }
    throw new Error('The device code expired. Run authup login again.');
}
