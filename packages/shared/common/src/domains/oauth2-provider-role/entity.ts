/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2Provider } from '../oauth2-provider';
import { Role } from '../role';
import { Realm } from '../realm';

export interface OAuth2ProviderRole {
    id: string;

    external_id: string;

    created_at: Date;

    updated_at: Date;

    // -----------------------------------------------

    role_id: string;

    role: Role;

    role_realm_id: Realm['id'] | null;

    role_realm: Realm | null;

    provider_id: string;

    provider: OAuth2Provider;

    provider_realm_id: Realm['id'] | null;

    provider_realm: Realm | null;
}
