/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { UserAttribute } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import type {
    CollectionResourceResponse, DomainAPI, SingleResourceResponse,
} from '../../types-base';

export class UserAttributeAPI extends BaseAPI implements DomainAPI<UserAttribute> {
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
