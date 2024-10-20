/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { UserAttribute } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../utils';
import { BaseAPI } from '../base';
import type {
    DomainAPI, ResourceCollectionResponse, ResourceResponse,
} from '../types-base';

export class UserAttributeAPI extends BaseAPI implements DomainAPI<UserAttribute> {
    async getMany(data?: BuildInput<UserAttribute>): Promise<ResourceCollectionResponse<UserAttribute>> {
        return this.client.get(`user-attributes${buildQuery(data)}`);
    }

    async getOne(roleId: UserAttribute['id']): Promise<ResourceResponse<UserAttribute>> {
        return this.client.get(`user-attributes/${roleId}`);
    }

    async delete(roleId: UserAttribute['id']): Promise<ResourceResponse<UserAttribute>> {
        return this.client.delete(`user-attributes/${roleId}`);
    }

    async create(data: Partial<UserAttribute>): Promise<ResourceResponse<UserAttribute>> {
        return this.client.post('user-attributes', nullifyEmptyObjectProperties(data));
    }

    async update(id: UserAttribute['id'], data: Partial<UserAttribute>): Promise<ResourceResponse<UserAttribute>> {
        return this.client.post(`user-attributes/${id}`, nullifyEmptyObjectProperties(data));
    }
}
