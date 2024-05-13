/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ClientManager } from '@authup/core-realtime-kit';
import type { App } from 'vue';
import { provideSocketClientManager } from './singleton';

export type SocketClientManagerInstallOptions = {
    baseURL: string
};

export function installSocketClientManager(app: App, options : SocketClientManagerInstallOptions) {
    const socketClientManager = new ClientManager({
        url: options.baseURL,
    });

    provideSocketClientManager(socketClientManager, app);
}
