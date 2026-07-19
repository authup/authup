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
        'authMethod' |
        'tokenBindingMethod' |
        'displayName' |
        'description' |
        'secret' |
        'secretEncrypted' |
        'secretHashed' |
        'redirectUri' |
        'postLogoutRedirectUri' |
        'baseUrl' |
        'rootUrl' |
        'grantTypes' |
        'scope' |
        'realmId' |
        'accessPolicyId'>>;
export type ClientUpdatePayload = Partial<ClientCreatePayload>;
export type ClientSavePayload = ClientCreatePayload;

export interface IClientAPI extends IEntityAPI<Client, ClientCreatePayload, ClientUpdatePayload> {
    createOrUpdate(idOrName: string, data: ClientSavePayload) : Promise<EntityRecordResponse<Client>>;
}
