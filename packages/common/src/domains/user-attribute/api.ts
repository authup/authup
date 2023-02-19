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
import type { UserAttribute } from './entity';
import type {
    CollectionResourceResponse, DomainAPI, SingleResourceResponse,
} from '../type';

export class UserAttributeAPI implements DomainAPI<UserAttribute> {
    protected client: ClientDriverInstance;

    constructor(client: ClientDriverInstance) {
        this.client = client;
    }

    async getMany(data?: BuildInput<UserAttribute>): Promise<CollectionResourceResponse<UserAttribute>> {
        const response = await this.client.get(`user-attributes${buildQuery(data)}`);

        return response.data;
    }

    async getOne(roleId: UserAttribute['id']): Promise<SingleResourceResponse<UserAttribute>> {
        const response = await this.client.get(`user-attributes/${roleId}`);

        return response.data;
    }

    async delete(roleId: UserAttribute['id']): Promise<SingleResourceResponse<UserAttribute>> {
        const response = await this.client.delete(`user-attributes/${roleId}`);

        return response.data;
    }

    async create(data: Partial<UserAttribute>): Promise<SingleResourceResponse<UserAttribute>> {
        const response = await this.client.post('user-attributes', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(id: UserAttribute['id'], data: Partial<UserAttribute>): Promise<SingleResourceResponse<UserAttribute>> {
        const response = await this.client.post(`user-attributes/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
