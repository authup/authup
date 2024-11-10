/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { RoleAttribute } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../utils';
import { BaseAPI } from '../base';
import type {
    CollectionResourceResponse, DomainAPI, SingleResourceResponse,
} from '../types-base';

export class RoleAttributeAPI extends BaseAPI implements DomainAPI<RoleAttribute> {
    async getMany(data?: BuildInput<RoleAttribute>): Promise<CollectionResourceResponse<RoleAttribute>> {
        const response = await this.client.get(`role-attributes${buildQuery(data)}`);

        return response.data;
    }

    async getOne(roleId: RoleAttribute['id']): Promise<SingleResourceResponse<RoleAttribute>> {
        const response = await this.client.get(`role-attributes/${roleId}`);

        return response.data;
    }

    async delete(roleId: RoleAttribute['id']): Promise<SingleResourceResponse<RoleAttribute>> {
        const response = await this.client.delete(`role-attributes/${roleId}`);

        return response.data;
    }

    async create(data: Partial<RoleAttribute>): Promise<SingleResourceResponse<RoleAttribute>> {
        const response = await this.client.post('role-attributes', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: RoleAttribute['id'], data: Partial<RoleAttribute>): Promise<SingleResourceResponse<RoleAttribute>> {
        const response = await this.client.post(`role-attributes/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
