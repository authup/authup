/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Driver } from 'hapic';
import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { Robot } from './types';
import { nullifyEmptyObjectProperties } from '../../utils';
import type { CollectionResourceResponse, DomainAPI, SingleResourceResponse } from '../types-base';

export class RobotAPI implements DomainAPI<Robot> {
    protected driver: Driver;

    constructor(client: Driver) {
        this.driver = client;
    }

    async getMany(
        options?: BuildInput<Robot>,
    ): Promise<CollectionResourceResponse<Robot>> {
        const response = await this.driver
            .get(`robots${buildQuery(options)}`);

        return response.data;
    }

    async getOne(
        id: Robot['id'],
        options?: BuildInput<Robot>,
    ): Promise<SingleResourceResponse<Robot>> {
        const response = await this.driver
            .get(`robots/${id}${buildQuery(options)}`);

        return response.data;
    }

    async delete(
        id: Robot['id'],
    ): Promise<SingleResourceResponse<Robot>> {
        const response = await this.driver
            .delete(`robots/${id}`);

        return response.data;
    }

    async create(
        data: Partial<Robot>,
    ): Promise<SingleResourceResponse<Robot>> {
        const response = await this.driver
            .post('robots', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(
        id: Robot['id'],
        data: Partial<Robot>,
    ): Promise<SingleResourceResponse<Robot>> {
        const response = await this.driver.post(`robots/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async integrity(
        id: Robot['id'] | Robot['name'],
    ): Promise<SingleResourceResponse<Robot>> {
        const { data: response } = await this.driver
            .get(`robots/${id}/integrity`);

        return response;
    }
}
