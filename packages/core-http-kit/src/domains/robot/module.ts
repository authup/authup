/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { Robot } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../utils';
import { BaseAPI } from '../base';
import type { DomainAPI, ResourceCollectionResponse, ResourceResponse } from '../types-base';

export class RobotAPI extends BaseAPI implements DomainAPI<Robot> {
    async getMany(
        options?: BuildInput<Robot>,
    ): Promise<ResourceCollectionResponse<Robot>> {
        return this.client
            .get(`robots${buildQuery(options)}`);
    }

    async getOne(
        id: Robot['id'],
        options?: BuildInput<Robot>,
    ): Promise<ResourceResponse<Robot>> {
        return this.client
            .get(`robots/${id}${buildQuery(options)}`);
    }

    async delete(
        id: Robot['id'],
    ): Promise<ResourceResponse<Robot>> {
        return this.client
            .delete(`robots/${id}`);
    }

    async create(
        data: Partial<Robot>,
    ): Promise<ResourceResponse<Robot>> {
        return this.client
            .post('robots', nullifyEmptyObjectProperties(data));
    }

    async update(
        id: Robot['id'],
        data: Partial<Robot>,
    ): Promise<ResourceResponse<Robot>> {
        return this.client.post(`robots/${id}`, nullifyEmptyObjectProperties(data));
    }

    async createOrUpdate(
        idOrName: string,
        data: Partial<Robot>,
    ): Promise<ResourceResponse<Robot>> {
        return this.client.put(`robots/${idOrName}`, nullifyEmptyObjectProperties(data));
    }

    async integrity(
        id: Robot['id'] | Robot['name'],
    ): Promise<ResourceResponse<Robot>> {
        return this.client
            .get(`robots/${id}/integrity`);
    }
}
