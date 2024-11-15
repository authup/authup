/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { Realm } from '@authup/core-kit';
import { nullifyEmptyObjectProperties } from '../../utils';
import { BaseAPI } from '../base';
import type { DomainAPI, ResourceCollectionResponse, ResourceResponse } from '../types-base';

export class RealmAPI extends BaseAPI implements DomainAPI<Realm> {
    async getMany(data?: BuildInput<Realm>): Promise<ResourceCollectionResponse<Realm>> {
        return this.client.get(`realms${buildQuery(data)}`);
    }

    async getOne(id: Realm['id']): Promise<ResourceResponse<Realm>> {
        return this.client.get(`realms/${id}`);
    }

    async delete(id: Realm['id']): Promise<ResourceResponse<Realm>> {
        return this.client.delete(`realms/${id}`);
    }

    async create(data: Partial<Realm>): Promise<ResourceResponse<Realm>> {
        return this.client.post('realms', nullifyEmptyObjectProperties(data));
    }

    async update(realmId: Realm['id'], data: Partial<Realm>): Promise<ResourceResponse<Realm>> {
        return this.client.post(`realms/${realmId}`, nullifyEmptyObjectProperties(data));
    }

    async createOrUpdate(
        idOrName: string,
        data: Partial<Realm>,
    ): Promise<ResourceResponse<Realm>> {
        return this.client.put(`realms/${idOrName}`, nullifyEmptyObjectProperties(data));
    }
}
