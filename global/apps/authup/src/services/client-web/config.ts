/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Container } from '@authup/config';
import type { Config } from '@authup/client-web-config';
import { buildConfig } from '@authup/client-web-config';
import { makeURLPublicAccessible } from '@authup/core';

export async function buildClientWebConfig(container: Container): Promise<Config> {
    const client = container.getData('client/web');
    const server = container.getData('server/core');

    if (server) {
        if (
            !client.apiUrl &&
            typeof server.publicUrl === 'string'
        ) {
            client.apiUrl = makeURLPublicAccessible(server.publicUrl);
        }

        if (
            !client.publicUrl &&
            typeof server.authorizeRedirectUrl === 'string'
        ) {
            client.apiUrl = makeURLPublicAccessible(server.authorizeRedirectUrl);
        }
    }

    return buildConfig({
        data: client,
        env: true,
    });
}
