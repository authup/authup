/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DomainType } from '../contstants';
import type { Realm } from '../realm';
import type { Role } from '../role';
import type { DomainEventBaseContext } from '../types-base';

export interface RoleAttribute {
    id: string;

    name: string;

    value: string | null;

    // ------------------------------------------------------------------

    role_id: Role['id'];

    role: Role;

    realm_id: Realm['id'] | null;

    realm: Realm | null;

    // ------------------------------------------------------------------

    created_at: string;

    updated_at: string;
}

export type RoleAttributeEventContext = DomainEventBaseContext & {
    type: `${DomainType.ROLE_ATTRIBUTE}`,
    data: RoleAttribute
};
