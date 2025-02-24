/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { ClientPermission } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import type {
    EntityAPISlim, EntityCollectionResponse, EntityRecordResponse,
} from '../../types-base';

export class ClientPermissionAPI extends BaseAPI implements EntityAPISlim<ClientPermission> {
    async getMany(data?: BuildInput<ClientPermission>) : Promise<EntityCollectionResponse<ClientPermission>> {
        const response = await this.client.get(`client-permissions${buildQuery(data)}`);
        return response.data;
    }

    async getOne(id: ClientPermission['id'], data?: BuildInput<ClientPermission>) : Promise<EntityRecordResponse<ClientPermission>> {
        const response = await this.client.get(`client-permissions/${id}${buildQuery(data)}`);

        return response.data;
    }

    async delete(id: ClientPermission['id']) : Promise<EntityRecordResponse<ClientPermission>> {
        const response = await this.client.delete(`client-permissions/${id}`);

        return response.data;
    }

    async create(data: Partial<ClientPermission>) : Promise<EntityRecordResponse<ClientPermission>> {
        const response = await this.client.post('client-permissions', data);

        return response.data;
    }
}
