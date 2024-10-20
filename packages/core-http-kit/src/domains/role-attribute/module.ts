/*
 * Copyright (c) 2021.
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
    DomainAPI, ResourceCollectionResponse, ResourceResponse,
} from '../types-base';

export class RoleAttributeAPI extends BaseAPI implements DomainAPI<RoleAttribute> {
    async getMany(data?: BuildInput<RoleAttribute>): Promise<ResourceCollectionResponse<RoleAttribute>> {
        return this.client.get(`role-attributes${buildQuery(data)}`);
    }

    async getOne(roleId: RoleAttribute['id']): Promise<ResourceResponse<RoleAttribute>> {
        return this.client.get(`role-attributes/${roleId}`);
    }

    async delete(roleId: RoleAttribute['id']): Promise<ResourceResponse<RoleAttribute>> {
        return this.client.delete(`role-attributes/${roleId}`);
    }

    async create(data: Partial<RoleAttribute>): Promise<ResourceResponse<RoleAttribute>> {
        return this.client.post('role-attributes', nullifyEmptyObjectProperties(data));
    }

    async update(id: RoleAttribute['id'], data: Partial<RoleAttribute>): Promise<ResourceResponse<RoleAttribute>> {
        return this.client.post(`role-attributes/${id}`, nullifyEmptyObjectProperties(data));
    }
}
