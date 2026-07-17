/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '../realm';
import type { IdentityProviderMappingSyncMode, IdentityProviderProtocol } from './constants';
import type { IdentityProviderPreset } from './preset';

export interface IdentityProvider {
    id: string,

    name: string,

    displayName: string | null;

    protocol: `${IdentityProviderProtocol}` | null;

    preset: `${IdentityProviderPreset}` | null;

    enabled: boolean;

    createdAt: string;

    updatedAt: string;

    realmId: Realm['id'];

    realm: Realm;
}

export interface IdentityProviderBaseMapping {
    name: string | null;

    value: string | null;

    valueIsRegex: boolean;

    synchronizationMode: `${IdentityProviderMappingSyncMode}` | null;

    providerId: IdentityProvider['id'];

    provider: IdentityProvider;

    providerRealmId: Realm['id'];

    providerRealm: Realm;
}
