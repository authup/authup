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

    display_name: string | null;

    protocol: `${IdentityProviderProtocol}` | null;

    preset: `${IdentityProviderPreset}` | null;

    enabled: boolean;

    created_at: string;

    updated_at: string;

    realm_id: Realm['id'];

    realm: Realm;
}

export interface IdentityProviderBaseMapping {
    name: string | null;

    value: string | null;

    value_is_regex: boolean;

    synchronization_mode: `${IdentityProviderMappingSyncMode}` | null;

    provider_id: IdentityProvider['id'];

    provider: IdentityProvider;

    provider_realm_id: Realm['id'];

    provider_realm: Realm;
}
