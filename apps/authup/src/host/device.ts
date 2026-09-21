/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getClientErrorCode } from '@authup/core-http-kit';
import type { Client } from '@authup/core-http-kit';
import { ErrorCode } from '@authup/errors';
import { isUUID } from '@authup/kit';
import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { isClientErrorWithStatusCode } from 'hapic';
import { setTimeout } from 'node:timers/promises';
import { DEVICE_SLOW_DOWN_MS } from './constants.ts';
import { writeNotice } from './output.ts';
import type { DeviceLoginOptions } from './types.ts';

function realmParams(realm?: string) : { realm_id?: string, realm_name?: string } {
    if (!realm) {
        return {};
    }

    return isUUID(realm) ? { realm_id: realm } : { realm_name: realm };
}

export async function runDeviceLogin(client: Client, options: DeviceLoginOptions) : Promise<OAuth2TokenGrantResponse> {
    // The hint rides BOTH calls: a client name resolves within the realm the
    // request names, and the poll that drops it resolves the name in the
    // master realm instead, so a client outside it mismatches the device
    // code's own client and the redemption answers invalid_grant.
    const realm = realmParams(options.realm);

    const device = await client.deviceAuthorization.create({
        client_id: options.clientId,
        scope: options.scope,
        ...realm,
    }).catch((e) => {
        if (isClientErrorWithStatusCode(e, 404)) {
            throw new Error(`${client.getBaseURL()} does not offer the device authorization grant. Check the server URL, or upgrade the deployment.`);
        }

        throw e;
    });

    writeNotice(`Open ${device.verification_uri_complete}`);
    writeNotice(`and confirm the code ${device.user_code}.`);

    const deadline = Date.now() + device.expires_in * 1000;
    let interval = device.interval * 1000;

    while (Date.now() < deadline) {
        await setTimeout(interval);

        try {
            return await client.token.createWithDeviceCode({
                client_id: options.clientId,
                device_code: device.device_code,
                ...realm,
            });
        } catch (e) {
            const code = getClientErrorCode(e);
            if (code === ErrorCode.OAUTH_AUTHORIZATION_PENDING) {
                continue;
            }

            if (code === ErrorCode.OAUTH_SLOW_DOWN) {
                interval += DEVICE_SLOW_DOWN_MS;
                continue;
            }

            throw e;
        }
    }

    throw new Error('The device code expired before the login was confirmed. Run `authup login` again.');
}
