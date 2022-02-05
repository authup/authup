/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ClientDriverInstance } from '@trapi/client';
import { BuildInput, buildQuery } from '@trapi/query';
import { Robot } from './entity';
import { nullifyEmptyObjectProperties } from '../../utils';
import { CollectionResourceResponse, SingleResourceResponse } from '../type';

export class RobotAPI {
    protected client: ClientDriverInstance;

    constructor(client: ClientDriverInstance) {
        this.client = client;
    }

    async executeCommand(
        id: Robot['id'],
        command: string,
        data: Record<string, any>,
    ): Promise<SingleResourceResponse<Robot>> {
        const { data: resultData } = await this.client
            .post(`robots/${id}/command`, { command, ...data });

        return resultData;
    }

    async getMany(
        options?: BuildInput<Robot>,
    ): Promise<CollectionResourceResponse<Robot>> {
        const response = await this.client
            .get(`robots${buildQuery(options)}`);

        return response.data;
    }

    async getOne(
        id: Robot['id'],
        options?: BuildInput<Robot>,
    ): Promise<SingleResourceResponse<Robot>> {
        const response = await this.client
            .get(`robots/${id}${buildQuery(options)}`);

        return response.data;
    }

    async delete(
        id: Robot['id'],
    ): Promise<SingleResourceResponse<Robot>> {
        const response = await this.client
            .delete(`robots/${id}`);

        return response.data;
    }

    async create(
        data: Partial<Robot>,
    ): Promise<SingleResourceResponse<Robot>> {
        const response = await this.client
            .post('robots', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(
        id: Robot['id'],
        data: Partial<Robot>,
    ): Promise<SingleResourceResponse<Robot>> {
        const response = await this.client.post(`robots/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
