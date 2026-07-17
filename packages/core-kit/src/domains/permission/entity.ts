/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecisionStrategy } from '@authup/kit';
import type { Client } from '../client';
import type { Policy } from '../policy';
import type { Realm } from '../realm';
import type { RealmScopeValue } from './constants.ts';

export interface PermissionRelation {
    policyId: Policy['id'] | null;

    policy: Policy | null;

    /**
     * Relative realm reach of this grant (none/own/ownOrNull/any). Fail-closed
     * default `own`. See {@link REALM_SCOPE}.
     */
    realmScope: RealmScopeValue;

    permissionId: Permission['id'];

    permission: Permission;

    permissionRealmId: Realm['id'] | null;

    permissionRealm: Realm | null;
}

export interface Permission {
    id: string;

    builtIn: boolean;

    name: string;

    displayName: string | null;

    description: string | null;

    decisionStrategy: `${DecisionStrategy}` | null;

    // ------------------------------------------------------------------

    clientId: Client['id'] | null;

    client: Client | null;

    // ------------------------------------------------------------------

    realmId: Realm['id'] | null;

    realm: Realm | null;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;
}
