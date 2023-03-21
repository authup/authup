/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

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

    provider_id: IdentityProvider['id'];

    provider: IdentityProvider;
}
