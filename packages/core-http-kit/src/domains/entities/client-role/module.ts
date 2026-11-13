/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { ClientRole } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import type { EntitySchemaResponse } from '../../stats';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type {
    ClientRoleCreatePayload,
    IClientRoleAPI,
} from './types';
import { buildRequestConfig } from '../../utils';

export class ClientRoleAPI extends BaseAPI implements IClientRoleAPI {
    async getSchema(options?: APIRequestOptions): Promise<EntitySchemaResponse> {
        const response = await this.client.get('client-roles/@schema', buildRequestConfig(options));

        return response.data;
    }

    async getMany(data: EntityQueryInput<ClientRole> = {}, options?: APIRequestOptions): Promise<EntityCollectionResponse<ClientRole>> {
        const response = await this.client.get(`client-roles${buildQueryString(data)}`, buildRequestConfig(options));

        return response.data;
    }

    async getOne(id: ClientRole['id'], record?: EntityQueryInput<ClientRole>, options?: APIRequestOptions): Promise<EntityRecordResponse<ClientRole>> {
        const response = await this.client.get(`client-roles/${id}${buildQueryString(record)}`, buildRequestConfig(options));

        return response.data;
    }

    async delete(id: ClientRole['id'], options?: APIRequestOptions): Promise<EntityRecordResponse<ClientRole>> {
        const response = await this.client.delete(`client-roles/${id}`, buildRequestConfig(options));

        return response.data;
    }

    async create(data: ClientRoleCreatePayload, options?: APIRequestOptions): Promise<EntityRecordResponse<ClientRole>> {
        const response = await this.client.post('client-roles', data, buildRequestConfig(options));

        return response.data;
    }
}
