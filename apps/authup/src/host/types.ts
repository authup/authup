/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-http-kit';
import type { ITransport } from 'hapic';
import type {
    HostEntry,
    HostTokens,
    IHostStore,
    IHostTokenStorage,
} from './store/index.ts';

export type HostCommandContext = {
    transport?: ITransport,
};

export type DeviceLoginOptions = {
    clientId: string,
    realm?: string,
    scope?: string,
};

export type HostClientContext = {
    host: string,
    entry: HostEntry,
    tokens: HostTokens,
    storage: IHostTokenStorage,
    directory: string,
    transport?: ITransport,
};

export type OpenedHost = {
    host: string,
    entry: HostEntry,
    tokens: HostTokens,
    storage: IHostTokenStorage,
    store: IHostStore,
    client: Client,
};
