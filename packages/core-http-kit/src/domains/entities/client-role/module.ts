/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { ClientRole } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import type {
    CollectionResourceResponse, DomainAPISlim, SingleResourceResponse,
} from '../../types-base';

export class ClientRoleAPI extends BaseAPI implements DomainAPISlim<ClientRole> {
    async getMany(data: BuildInput<ClientRole> = {}): Promise<CollectionResourceResponse<ClientRole>> {
        const response = await this.client.get(`client-roles${buildQuery(data)}`);

        return response.data;
    }

    async getOne(id: ClientRole['id']): Promise<SingleResourceResponse<ClientRole>> {
        const response = await this.client.get(`client-roles/${id}`);

        return response.data;
    }

    async delete(id: ClientRole['id']): Promise<SingleResourceResponse<ClientRole>> {
        const response = await this.client.delete(`client-roles/${id}`);

        return response.data;
    }

    async create(data: Partial<ClientRole>): Promise<SingleResourceResponse<ClientRole>> {
        const response = await this.client.post('client-roles', data);

        return response.data;
    }
}
