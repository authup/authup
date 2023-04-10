/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { Driver } from 'hapic';
import type { ClientScope } from './types';
import type { CollectionResourceResponse, DomainAPISlim, SingleResourceResponse } from '../types-base';

export class ClientScopeAPI implements DomainAPISlim<ClientScope> {
    protected driver: Driver;

    constructor(client: Driver) {
        this.driver = client;
    }

    async getMany(data?: BuildInput<ClientScope>) : Promise<CollectionResourceResponse<ClientScope>> {
        const response = await this.driver.get(`client-scopes${buildQuery(data)}`);
        return response.data;
    }

    async getOne(id: ClientScope['id']) : Promise<SingleResourceResponse<ClientScope>> {
        const response = await this.driver.get(`client-scopes/${id}`);

        return response.data;
    }

    async delete(id: ClientScope['id']) : Promise<SingleResourceResponse<ClientScope>> {
        const response = await this.driver.delete(`client-scopes/${id}`);

        return response.data;
    }

    async create(data: Partial<ClientScope>) : Promise<SingleResourceResponse<ClientScope>> {
        const response = await this.driver.post('client-scopes', data);

        return response.data;
    }
}
