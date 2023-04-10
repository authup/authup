/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { Driver } from 'hapic';
import { nullifyEmptyObjectProperties } from '../../utils';
import type { Realm } from './types';
import type { CollectionResourceResponse, DomainAPI, SingleResourceResponse } from '../types-base';

export class RealmAPI implements DomainAPI<Realm> {
    protected driver: Driver;

    constructor(client: Driver) {
        this.driver = client;
    }

    async getMany(data?: BuildInput<Realm>): Promise<CollectionResourceResponse<Realm>> {
        const response = await this.driver.get(`realms${buildQuery(data)}`);

        return response.data;
    }

    async getOne(id: Realm['id']): Promise<SingleResourceResponse<Realm>> {
        const response = await this.driver.get(`realms/${id}`);

        return response.data;
    }

    async delete(id: Realm['id']): Promise<SingleResourceResponse<Realm>> {
        const response = await this.driver.delete(`realms/${id}`);

        return response.data;
    }

    async create(data: Partial<Realm>): Promise<SingleResourceResponse<Realm>> {
        const response = await this.driver.post('realms', nullifyEmptyObjectProperties(data));

        return response.data;
    }

    async update(realmId: Realm['id'], data: Partial<Realm>): Promise<SingleResourceResponse<Realm>> {
        const response = await this.driver.post(`realms/${realmId}`, nullifyEmptyObjectProperties(data));

        return response.data;
    }
}
