/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IClient } from '@authup/core-http-kit';
import type { Pinia } from 'pinia';

/**
 * A client the kit uses for every consumer (the store, the provided client,
 * the hook's refresh and revoke), or a function the kit calls once per
 * consumer. Prefer the function, returning a NEW client per call: with one
 * instance the hook's refresh runs on the client the hook is attached to,
 * where a 401 from `/token` waits on its own refresh.
 */
export type HTTPClientInput = IClient | (() => IClient);

export type HTTPClientBuildOptions = {
    baseURL?: string,
    httpClient?: HTTPClientInput,
};

export type HTTPClientInstallOptions = HTTPClientBuildOptions & {
    pinia?: Pinia,
    isServer?: boolean
};
