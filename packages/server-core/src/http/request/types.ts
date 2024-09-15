/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RequestPermissionChecker } from './permission';

export type RequestIdentity = {
    id: string;
    type: 'user' | 'client' | 'robot',
    realmId: string,
    realmName: string
    attributes?: Record<string, any>,
};

export type RequestEnv = {
    identity?: RequestIdentity,

    token?: string,
    scopes?: string[],

    permissionChecker: RequestPermissionChecker
};
