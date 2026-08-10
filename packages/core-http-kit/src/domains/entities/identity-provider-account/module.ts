/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import { buildQueryString } from '../../../helpers';
import type { IdentityProviderAccount } from '@authup/core-kit';
import { BaseAPI } from '../../base';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';
import type { IIdentityProviderAccountAPI } from './types';

export class IdentityProviderAccountAPI extends BaseAPI implements IIdentityProviderAccountAPI {
    async getMany(data?: EntityQueryInput<IdentityProviderAccount>): Promise<EntityCollectionResponse<IdentityProviderAccount>> {
        const response = await this.client.get(`identity-provider-accounts${buildQueryString(data)}`);

        return response.data;
    }

    async getOne(
        id: IdentityProviderAccount['id'],
        record?: EntityQueryInput<IdentityProviderAccount>,
    ): Promise<EntityRecordResponse<IdentityProviderAccount>> {
        const response = await this.client.get(`identity-provider-accounts/${id}${buildQueryString(record)}`);

        return response.data;
    }

    async delete(id: IdentityProviderAccount['id']): Promise<EntityRecordResponse<IdentityProviderAccount>> {
        const response = await this.client.delete(`identity-provider-accounts/${id}`);

        return response.data;
    }
}
