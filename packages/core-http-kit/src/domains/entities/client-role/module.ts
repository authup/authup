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
import type { EntityCollectionResponse, EntityRecordWrappedResponse } from '../../types-base';
import type {
    ClientRoleCreatePayload,
    IClientRoleAPI,
} from './types';

export class ClientRoleAPI extends BaseAPI implements IClientRoleAPI {
    async getMany(data: EntityQueryInput<ClientRole> = {}): Promise<EntityCollectionResponse<ClientRole>> {
        const response = await this.client.get(`client-roles${buildQueryString(data)}`);

        return response.data;
    }

    async getOne(id: ClientRole['id'], record?: EntityQueryInput<ClientRole>): Promise<EntityRecordWrappedResponse<ClientRole>> {
        const response = await this.client.get(`client-roles/${id}${buildQueryString(record)}`);

        return response.data;
    }

    async delete(id: ClientRole['id']): Promise<EntityRecordWrappedResponse<ClientRole>> {
        const response = await this.client.delete(`client-roles/${id}`);

        return response.data;
    }

    async create(data: ClientRoleCreatePayload): Promise<EntityRecordWrappedResponse<ClientRole>> {
        const response = await this.client.post('client-roles', data);

        return response.data;
    }
}
