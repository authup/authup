/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EventPayload } from '@authup/kit';
import type { DomainType } from '../contstants';
import type { Realm } from '../realm';
import type { IdentityProviderMappingSyncMode, IdentityProviderProtocol } from './constants';
import type { IdentityProviderPreset } from './preset';

export interface IdentityProvider {
    id: string,

    name: string,

    slug: string;

    protocol: `${IdentityProviderProtocol}` | null;

    preset: `${IdentityProviderPreset}` | null;

    enabled: boolean;

    created_at: Date | string;

    updated_at: Date | string;

    realm_id: Realm['id'];

    realm: Realm;
}

export interface IdentityProviderMappingRelation {
    synchronization_mode: `${IdentityProviderMappingSyncMode}` | null;

    provider_id: IdentityProvider['id'];

    provider: IdentityProvider;

    provider_realm_id: Realm['id'];

    provider_realm: Realm;
}

export type IdentityProviderEventContext = EventPayload & {
    type: `${DomainType.IDENTITY_PROVIDER}`,
    data: IdentityProvider
};
