/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { ClientDriverInstance } from 'hapic';
import { nullifyEmptyObjectProperties } from '../../utils';
import type { RoleAttribute } from './entity';
import type {
    CollectionResourceResponse, DomainAPI, SingleResourceResponse,
} from '../type';

export class RoleAttributeAPI implements DomainAPI<RoleAttribute> {
    protected client: ClientDriverInstance;

    constructor(client: ClientDriverInstance) {
        this.client = client;
    }

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
