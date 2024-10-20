/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { User } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../utils';
import { BaseAPI } from '../base';
import type { DomainAPI, ResourceCollectionResponse, ResourceResponse } from '../types-base';

export class UserAPI extends BaseAPI implements DomainAPI<User> {
    async getMany(
        options?: BuildInput<User>,
    ): Promise<ResourceCollectionResponse<User>> {
        return this.client
            .get(`users${buildQuery(options)}`);
    }

    async getOne(
        id: User['id'],
        options?: BuildInput<User>,
    ): Promise<ResourceResponse<User>> {
        return this.client
            .get(`users/${id}${buildQuery(options)}`);
    }

    async delete(
        id: User['id'],
    ): Promise<ResourceResponse<User>> {
        return this.client
            .delete(`users/${id}`);
    }

    async create(
        data: Partial<User>,
    ): Promise<ResourceResponse<User>> {
        return this.client
            .post('users', nullifyEmptyObjectProperties(data));
    }

    async update(
        id: User['id'],
        data: Partial<User> & { password_repeat?: User['password'] },
    ): Promise<ResourceResponse<User>> {
        return this.client.post(`users/${id}`, nullifyEmptyObjectProperties(data));
    }

    async createOrUpdate(
        idOrName: string,
        data: Partial<User> & { password_repeat?: User['password'] },
    ): Promise<ResourceResponse<User>> {
        return this.client.put(`users/${idOrName}`, nullifyEmptyObjectProperties(data));
    }
}
