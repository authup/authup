/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName } from '@authup/core-kit';

/**
 * One of these lets a visitor read the token exchange policies, the same set
 * the server's read gate accepts.
 */
export const TOKEN_EXCHANGE_POLICY_ACCESS_PERMISSIONS : `${PermissionName}`[] = [
    PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_READ,
    PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_UPDATE,
    PermissionName.CLIENT_TOKEN_EXCHANGE_POLICY_DELETE,
];
