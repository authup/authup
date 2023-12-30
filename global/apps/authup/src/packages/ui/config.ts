/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Container } from '@authup/config';
import type { Config } from '@authup/client-web-config';
import { buildConfig } from '@authup/client-web-config';
import { makeURLPublicAccessible } from '@authup/core';

export async function buildClientWebConfig(input?: Container): Promise<Config> {
    let container : Container;
    if (input) {
        container = input;
    } else {
        container = new Container();
        await container.load();
    }

    const client = container.get({
        group: 'client',
        id: 'web',
    });

    const server = container.get({
        group: 'server',
        id: 'core',
    });

    if (server) {
        if (
            !client.apiUrl &&
            typeof server.publicUrl === 'string'
        ) {
            client.apiUrl = makeURLPublicAccessible(server.publicUrl);
        }

        // todo: check raw.server.core existence ...
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
