/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { ClientDriverInstance } from 'hapic';
import type { ClientScope } from './module';
import type { CollectionResourceResponse, DomainAPISlim, SingleResourceResponse } from '../type';

export class ClientScopeAPI implements DomainAPISlim<ClientScope> {
    protected client: ClientDriverInstance;

    constructor(client: ClientDriverInstance) {
        this.client = client;
    }

    async getMany(data?: BuildInput<ClientScope>) : Promise<CollectionResourceResponse<ClientScope>> {
        const response = await this.client.get(`client-scopes${buildQuery(data)}`);
        return response.data;
    }

    async getOne(id: ClientScope['id']) : Promise<SingleResourceResponse<ClientScope>> {
        const response = await this.client.get(`client-scopes/${id}`);

        return response.data;
    }

    async delete(id: ClientScope['id']) : Promise<SingleResourceResponse<ClientScope>> {
        const response = await this.client.delete(`client-scopes/${id}`);

        return response.data;
    }

    async create(data: Partial<ClientScope>) : Promise<SingleResourceResponse<ClientScope>> {
        const response = await this.client.post('client-scopes', data);

        return response.data;
    }
}
