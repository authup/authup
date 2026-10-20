/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { HTTPClientBuildOptions } from '../types';
import type { Pinia } from 'pinia';

export type HTTPClientAuthenticationHookInstallOptions = HTTPClientBuildOptions & {
    pinia?: Pinia,
    isServer?: boolean
};
