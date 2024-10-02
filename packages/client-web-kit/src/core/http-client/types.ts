/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Pinia } from 'pinia';

export type HTTPClientInstallOptions = {
    baseURL?: string,
    pinia?: Pinia,
    isServer?: boolean
};
