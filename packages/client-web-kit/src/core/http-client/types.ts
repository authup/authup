/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IClient } from '@authup/core-http-kit';
import type { Pinia } from 'pinia';

export type HTTPClientInstallOptions = {
    baseURL?: string,
    httpClient?: IClient,
    pinia?: Pinia,
    isServer?: boolean
};
