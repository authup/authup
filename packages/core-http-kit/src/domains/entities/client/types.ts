/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-kit';

// Mirrors `ClientValidator` mounts in @authup/core-kit.
export type ClientCreatePayload = Pick<Client, 'name'> &
    Partial<Pick<Client, 'active' |
        'is_confidential' |
        'display_name' |
        'description' |
        'secret' |
        'secret_encrypted' |
        'secret_hashed' |
        'redirect_uri' |
        'base_url' |
        'root_url' |
        'grant_types' |
        'scope' |
        'realm_id'>>;
export type ClientUpdatePayload = Partial<ClientCreatePayload>;
export type ClientSavePayload = ClientCreatePayload;
