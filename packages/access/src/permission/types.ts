/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyWithType } from '../policy';

export type PermissionItem = {
    name: string,
    client_id?: string | null,
    realm_id?: string | null,
    policy?: PolicyWithType,
};
