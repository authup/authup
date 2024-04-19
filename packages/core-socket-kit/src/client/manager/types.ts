/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ManagerOptions } from 'socket.io-client';

export type ClientManagerTokenFn = () => string | undefined;

export type ClientManagerContext = {
    url: string,
    options?: Partial<ManagerOptions>,
    token?: string | ClientManagerTokenFn
};
