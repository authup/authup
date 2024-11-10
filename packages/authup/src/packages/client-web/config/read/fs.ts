/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { makeURLPublicAccessible } from '@authup/kit';
import { Container } from 'confinity';
import type { ClientWebConfigInput } from '../type';

export type ClientWebConfigReadFsOptions = {
    cwd?: string,
    file?: string | string[]
};

export async function readClientWebConfigFromFS(options: ClientWebConfigReadFsOptions = {}) : Promise<ClientWebConfigInput> {
    const container = new Container({
        prefix: 'authup',
        cwd: options.cwd,
    });

    if (options.file) {
        await container.loadFile(options.file);
    } else {
        await container.load();
    }

    const clientRaw = container.get('client.web') || {};
    const serverRaw = container.get('server.core') || {};
    if (serverRaw) {
        if (
            !clientRaw.apiUrl &&
            typeof serverRaw.publicUrl === 'string'
        ) {
            clientRaw.apiUrl = makeURLPublicAccessible(serverRaw.publicUrl);
        }

        if (
            !clientRaw.publicUrl &&
            typeof serverRaw.authorizeRedirectUrl === 'string'
        ) {
            clientRaw.apiUrl = makeURLPublicAccessible(serverRaw.authorizeRedirectUrl);
        }
    }

    return clientRaw;
}
