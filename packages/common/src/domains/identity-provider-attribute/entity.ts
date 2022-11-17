/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { IdentityProvider } from '../identity-provider';

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
