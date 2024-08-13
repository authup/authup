/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { Role } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../utils';
import { BaseAPI } from '../base';
import type {
    CollectionResourceResponse, DomainAPI, SingleResourceResponse,
} from '../types-base';

export class RoleAPI extends BaseAPI implements DomainAPI<Role> {
    async getMany(data?: BuildInput<Role>): Promise<CollectionResourceResponse<Role>> {
        const response = await this.client.get(`roles${buildQuery(data)}`);

        return response.data;
    }

    async getOne(roleId: Role['id']): Promise<SingleResourceResponse<Role>> {
        const response = await this.client.get(`roles/${roleId}`);

        return response.data;
    }

    async delete(roleId: Role['id']): Promise<SingleResourceResponse<Role>> {
        const response = await this.client.delete(`roles/${roleId}`);

        return response.data;
    }

    async create(data: Partial<Role>): Promise<SingleResourceResponse<Role>> {
        const response = await this.client.post('roles', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: Role['id'], data: Partial<Role>): Promise<SingleResourceResponse<Role>> {
        const response = await this.client.post(`roles/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async createOrUpdate(
        idOrName: string,
        data: Partial<Role>,
    ): Promise<SingleResourceResponse<Role>> {
        const response = await this.client.put(`roles/${idOrName}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
