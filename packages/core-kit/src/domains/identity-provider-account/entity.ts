/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '../realm';
import type { User } from '../user';
import type { IdentityProvider } from '../identity-provider';

export interface IdentityProviderAccount {
    id: string;

    providerUserId: string;

    providerUserName: string;

    providerUserEmail: string;

    createdAt: string;

    updatedAt: string;

    // -----------------------------------------------

    userId: string;

    user: User;

    userRealmId: Realm['id'] | null;

    userRealm: Realm | null;

    providerId: IdentityProvider['id'];

    provider: IdentityProvider;

    providerRealmId: Realm['id'] | null;

    providerRealm: Realm | null;
}
