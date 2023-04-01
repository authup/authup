/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DomainType } from '../contstants';
import type { Realm } from '../realm';
import type { DomainEventBaseContext } from '../types-base';
import type { IdentityProviderProtocol, IdentityProviderProtocolConfig } from './constants';

export interface IdentityProvider {
    id: string,

    name: string,

    slug: string;

    protocol: `${IdentityProviderProtocol}`;

    protocol_config: `${IdentityProviderProtocolConfig}` | null;

    enabled: boolean;

    created_at: Date | string;

    updated_at: Date | string;

    realm_id: Realm['id'];

    realm: Realm;
}

export type IdentityProviderEventContext = DomainEventBaseContext & {
    type: `${DomainType.IDENTITY_PROVIDER}`,
    data: IdentityProvider
};
