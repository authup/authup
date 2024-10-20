/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-kit';
import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import { nullifyEmptyObjectProperties } from '../../utils';
import { BaseAPI } from '../base';
import type { DomainAPI, ResourceCollectionResponse, ResourceResponse } from '../types-base';

export class ClientAPI extends BaseAPI implements DomainAPI<Client> {
    async getMany(
        options?: BuildInput<Client>,
    ): Promise<ResourceCollectionResponse<Client>> {
        return this.client
            .get(`clients${buildQuery(options)}`);
    }

    async getOne(
        id: Client['id'],
        options?: BuildInput<Client>,
    ): Promise<ResourceResponse<Client>> {
        return this.client
            .get(`clients/${id}${buildQuery(options)}`);
    }

    async delete(
        id: Client['id'],
    ): Promise<ResourceResponse<Client>> {
        return this.client
            .delete(`clients/${id}`);
    }

    async create(
        data: Partial<Client>,
    ): Promise<ResourceResponse<Client>> {
        return this.client
            .post('clients', nullifyEmptyObjectProperties(data));
    }

    async update(
        id: Client['id'],
        data: Partial<Client>,
    ): Promise<ResourceResponse<Client>> {
        return this.client.post(`clients/${id}`, nullifyEmptyObjectProperties(data));
    }

    async createOrUpdate(
        idOrName: string,
        data: Partial<Client>,
    ): Promise<ResourceResponse<Client>> {
        return this.client.put(`clients/${idOrName}`, nullifyEmptyObjectProperties(data));
    }
}
