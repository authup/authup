/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { Realm } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../../utils';
import { BaseAPI } from '../../base';
import type { EntityAPI, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';

export class RealmAPI extends BaseAPI implements EntityAPI<Realm> {
    async getMany(data?: BuildInput<Realm>): Promise<EntityCollectionResponse<Realm>> {
        const response = await this.client.get(`realms${buildQuery(data)}`);

        return response.data;
    }

    async getOne(id: Realm['id']): Promise<EntityRecordResponse<Realm>> {
        const response = await this.client.get(`realms/${id}`);

        return response.data;
    }

    async delete(id: Realm['id']): Promise<EntityRecordResponse<Realm>> {
        const response = await this.client.delete(`realms/${id}`);

        return response.data;
    }

    async create(data: Partial<Realm>): Promise<EntityRecordResponse<Realm>> {
        const response = await this.client.post('realms', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(realmId: Realm['id'], data: Partial<Realm>): Promise<EntityRecordResponse<Realm>> {
        const response = await this.client.post(`realms/${realmId}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async createOrUpdate(
        idOrName: string,
        data: Partial<Realm>,
    ): Promise<EntityRecordResponse<Realm>> {
        const response = await this.client.put(`realms/${idOrName}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
