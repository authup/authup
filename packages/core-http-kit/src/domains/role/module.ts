/*
 * Copyright (c) 2021-2024.
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
    DomainAPI, ResourceCollectionResponse, ResourceResponse,
} from '../types-base';

export class RoleAPI extends BaseAPI implements DomainAPI<Role> {
    async getMany(data?: BuildInput<Role>): Promise<ResourceCollectionResponse<Role>> {
        return this.client.get(`roles${buildQuery(data)}`);
    }

    async getOne(roleId: Role['id']): Promise<ResourceResponse<Role>> {
        return this.client.get(`roles/${roleId}`);
    }

    async delete(roleId: Role['id']): Promise<ResourceResponse<Role>> {
        return this.client.delete(`roles/${roleId}`);
    }

    async create(data: Partial<Role>): Promise<ResourceResponse<Role>> {
        return this.client.post('roles', nullifyEmptyObjectProperties(data));
    }

    async update(id: Role['id'], data: Partial<Role>): Promise<ResourceResponse<Role>> {
        return this.client.post(`roles/${id}`, nullifyEmptyObjectProperties(data));
    }

    async createOrUpdate(
        idOrName: string,
        data: Partial<Role>,
    ): Promise<ResourceResponse<Role>> {
        return this.client.put(`roles/${idOrName}`, nullifyEmptyObjectProperties(data));
    }
}
