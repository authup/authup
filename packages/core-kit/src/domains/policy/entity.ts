/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyWithType } from '@authup/kit';
import type { Realm } from '../realm';

export interface Policy {
    id: string;

    built_in: boolean;

    type: string;

    name: string;

    display_name: string | null;

    description: string | null;

    invert: boolean;

    children: PolicyWithType[];

    parent_id?: string,

    // ------------------------------------------------------------------

    realm_id: Realm['id'] | null;

    realm: Realm | null;

    // ------------------------------------------------------------------

    created_at: Date;

    updated_at: Date;
}

export type ExtendedPolicy<
    T extends Record<string, any> = Record<string, any>,
> = Policy & T;
