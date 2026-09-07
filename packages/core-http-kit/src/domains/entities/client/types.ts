/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityRecordResponse, IEntityAPI } from '../../types-base';

import type { Client, ClientSecretRotatePayload } from '@authup/core-kit';

export type { ClientSecretRotatePayload };

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
        'backchannelLogoutUri' |
        'baseUrl' |
        'grantTypes' |
        'realmId' |
        'accessPolicyId'>>;
/**
 * The storage mode is a create-time property: on an existing client it
 * changes only through `rotateSecret`, together with a new plaintext.
 */
export type ClientUpdatePayload = Partial<Omit<ClientCreatePayload, 'secretEncrypted' | 'secretHashed'>>;
export type ClientSavePayload = ClientCreatePayload;

/**
 * Shown-once material riding the rotate response `meta`: the plaintext
 * secret, present in this response only.
 */
export type ClientSecretRotateResponseMeta = {
    secret: string,
};

export type ClientSecretRotateResponse = EntityRecordResponse<Client, ClientSecretRotateResponseMeta>;

export interface IClientAPI extends IEntityAPI<Client, ClientCreatePayload, ClientUpdatePayload> {
    createOrUpdate(idOrName: string, data: ClientSavePayload) : Promise<EntityRecordResponse<Client>>;

    rotateSecret(id: Client['id'], data?: ClientSecretRotatePayload) : Promise<ClientSecretRotateResponse>;
}
