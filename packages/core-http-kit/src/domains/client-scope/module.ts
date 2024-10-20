/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import { buildQuery } from 'rapiq';
import type { ClientScope } from '@authup/core-kit';
import { BaseAPI } from '../base';
import type { DomainAPISlim, ResourceCollectionResponse, ResourceResponse } from '../types-base';

export class ClientScopeAPI extends BaseAPI implements DomainAPISlim<ClientScope> {
    async getMany(data?: BuildInput<ClientScope>) : Promise<ResourceCollectionResponse<ClientScope>> {
        return this.client.get(`client-scopes${buildQuery(data)}`);
    }

    async getOne(id: ClientScope['id']) : Promise<ResourceResponse<ClientScope>> {
        return this.client.get(`client-scopes/${id}`);
    }

    async delete(id: ClientScope['id']) : Promise<ResourceResponse<ClientScope>> {
        return this.client.delete(`client-scopes/${id}`);
    }

    async create(data: Partial<ClientScope>) : Promise<ResourceResponse<ClientScope>> {
        return this.client.post('client-scopes', data);
    }
}
