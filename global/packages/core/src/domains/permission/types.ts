/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MongoQuery } from '@ucast/mongo2js';
import type { DomainType } from '../contstants';
import type { Realm } from '../realm';
import type { DomainEventBaseContext } from '../types-base';

export type PermissionCondition = MongoQuery;

export interface PermissionRelation {
    power: number;

    condition: PermissionCondition | null;

    fields: string | null;

    negation: boolean;

    target: string | null;

    // ------------------------------------------------------------------

    permission_id: Permission['id'];

    permission: Permission;

    permission_realm_id: Realm['id'] | null;

    permission_realm: Realm | null;
}

export interface Permission {
    id: string;

    built_in: boolean;

    name: string;

    description: string | null;

    target: string | null;

    // ------------------------------------------------------------------

    realm_id: Realm['id'] | null;

    realm: Realm | null;

    // ------------------------------------------------------------------

    created_at: Date;

    updated_at: Date;
}

export type PermissionEventContext = DomainEventBaseContext & {
    type: `${DomainType.PERMISSION}`,
    data: Permission
};
