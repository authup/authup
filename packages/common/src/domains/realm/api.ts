/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuildInput, buildQuery } from '@trapi/query';
import { AxiosInstance } from 'axios';
import { nullifyEmptyObjectProperties } from '../../utils';
import { Realm } from './entity';
import { CollectionResourceResponse, SingleResourceResponse } from '../../http';

export class RealmAPI {
    protected client: AxiosInstance;

    constructor(client: AxiosInstance) {
        this.client = client;
    }

    async getMany(data?: BuildInput<Realm>): Promise<CollectionResourceResponse<Realm>> {
        const response = await this.client.get(`realms${buildQuery(data)}`);

        return response.data;
    }

    async getOne(id: typeof Realm.prototype.id): Promise<SingleResourceResponse<Realm>> {
        const response = await this.client.get(`realms/${id}`);

        return response.data;
    }

    async delete(id: typeof Realm.prototype.id): Promise<SingleResourceResponse<Realm>> {
        const response = await this.client.delete(`realms/${id}`);

        return response.data;
    }

    async create(data: Partial<Realm>): Promise<SingleResourceResponse<Realm>> {
        const response = await this.client.post('realms', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(realmId: typeof Realm.prototype.id, data: Partial<Realm>): Promise<SingleResourceResponse<Realm>> {
        const response = await this.client.post(`realms/${realmId}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
