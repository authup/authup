/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuildInput, buildQuery } from '@trapi/query';
import { AxiosInstance } from 'axios';
import { nullifyEmptyObjectProperties } from '../../utils';
import { User } from './entity';
import { CollectionResourceResponse, SingleResourceResponse } from '../type';

export class UserAPI {
    protected client: AxiosInstance;

    constructor(client: AxiosInstance) {
        this.client = client;
    }

    async getMany(
        options?: BuildInput<User>,
    ): Promise<CollectionResourceResponse<User>> {
        const response = await this.client
            .get(`users${buildQuery(options)}`);

        return response.data;
    }

    async getOne(
        id: User['id'],
        options?: BuildInput<User>,
    ): Promise<SingleResourceResponse<User>> {
        const response = await this.client
            .get(`users/${id}${buildQuery(options)}`);

        return response.data;
    }

    async delete(
        id: User['id'],
    ): Promise<SingleResourceResponse<User>> {
        const response = await this.client
            .delete(`users/${id}`);

        return response.data;
    }

    async create(
        data: Partial<User>,
    ): Promise<SingleResourceResponse<User>> {
        const response = await this.client
            .post('users', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(
        id: User['id'],
        data: Partial<User> & { password_repeat: User['password'] },
    ): Promise<SingleResourceResponse<User>> {
        const response = await this.client.post(`users/${id}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
