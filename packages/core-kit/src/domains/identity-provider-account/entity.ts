/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EventPayload } from '@authup/kit';
import type { DomainType } from '../contstants';
import type { Realm } from '../realm';
import type { User } from '../user';
import type { IdentityProvider } from '../identity-provider';

export interface IdentityProviderAccount {
    id: string;

    provider_user_id: string;

    provider_user_name: string;

    provider_user_email: string;

    created_at: Date;

    updated_at: Date;

    // -----------------------------------------------

    user_id: string;

    user: User;

    user_realm_id: Realm['id'] | null;

    user_realm: Realm | null;

    provider_id: IdentityProvider['id'];

    provider: IdentityProvider;

    provider_realm_id: Realm['id'] | null;

    provider_realm: Realm | null;
}

export type IdentityProviderAccountEventContext = EventPayload & {
    type: `${DomainType.IDENTITY_PROVIDER_ACCOUNT}`,
    data: IdentityProviderAccount
};
