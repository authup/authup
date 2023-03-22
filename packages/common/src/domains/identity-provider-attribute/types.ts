/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DomainType } from '../contstants';
import type { IdentityProvider } from '../identity-provider';
import type { DomainEventBaseContext } from '../types-base';

export interface IdentityProviderAttribute {
    id: string;

    name: string;

    value: string | null;

    // ------------------------------------------------------------------

    provider_id: IdentityProvider['id'];

    provider: IdentityProvider;

    // ------------------------------------------------------------------

    created_at: string;

    updated_at: string;
}

export type IdentityProviderAttributeEventContext = DomainEventBaseContext & {
    type: `${DomainType.IDENTITY_PROVIDER_ATTRIBUTE}`,
    data: IdentityProviderAttribute
};
