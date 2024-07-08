/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AnyPolicy } from '../policy';

// todo: move this to store.
export type PermissionItem = {
    name: string,
    realmId?: string | null,
    policy?: AnyPolicy,
};
