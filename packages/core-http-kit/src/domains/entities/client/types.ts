/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityRecordResponse, IEntityAPI } from '../../types-base';

import type { Client } from '@authup/core-kit';

// Mirrors `ClientValidator` mounts in @authup/core-kit.
export type ClientCreatePayload = Pick<Client, 'name'> &
    Partial<Pick<Client, 'active' |
        'auth_method' |
        'token_binding_method' |
        'display_name' |
        'description' |
        'secret' |
        'secret_encrypted' |
        'secret_hashed' |
        'redirect_uri' |
        'post_logout_redirect_uri' |
        'base_url' |
        'root_url' |
        'grant_types' |
        'scope' |
        'realm_id' |
        'access_policy_id'>>;
export type ClientUpdatePayload = Partial<ClientCreatePayload>;
export type ClientSavePayload = ClientCreatePayload;

export interface IClientAPI extends IEntityAPI<Client, ClientCreatePayload, ClientUpdatePayload> {
    createOrUpdate(idOrName: string, data: ClientSavePayload) : Promise<EntityRecordResponse<Client>>;
}
