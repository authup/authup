/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider } from '../identity-provider';
import type { Realm } from '../realm';

export interface IdentityProviderAttribute {
    id: string;

    name: string;

    value: string | null;

    // ------------------------------------------------------------------

    providerId: IdentityProvider['id'];

    provider: IdentityProvider;

    // ------------------------------------------------------------------

    realmId: Realm['id'] | null;

    realm: Realm | null;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;
}
