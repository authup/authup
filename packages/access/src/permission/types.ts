/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyWithType } from '../policy';

export type PermissionItem = {
    name: string,
    clientId?: string | null,
    realmId?: string | null,
    policy?: PolicyWithType,
};
