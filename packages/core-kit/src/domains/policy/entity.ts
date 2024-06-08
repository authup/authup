/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AnyPolicy, BuiltInPolicyType } from '@authup/kit';
import type { Realm } from '../realm';

export interface Policy {
    id: string;

    type: `${BuiltInPolicyType}`;

    name: string;

    description: string | null;

    invert: boolean;

    children: AnyPolicy[];

    parent_id?: string,

    // ------------------------------------------------------------------

    realm_id: Realm['id'] | null;

    realm: Realm | null;

    // ------------------------------------------------------------------

    created_at: Date;

    updated_at: Date;
}
