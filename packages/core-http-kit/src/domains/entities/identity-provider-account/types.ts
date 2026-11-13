/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import type { IdentityProviderAccount } from '@authup/core-kit';
import type { IEntitySchemaAPI } from '../../stats';
import type { APIRequestOptions, EntityCollectionResponse, EntityRecordResponse } from '../../types-base';

export interface IIdentityProviderAccountAPI extends IEntitySchemaAPI {
    getMany(
        data?: EntityQueryInput<IdentityProviderAccount>,
        options?: APIRequestOptions,
    ): Promise<EntityCollectionResponse<IdentityProviderAccount>>;

    getOne(id: IdentityProviderAccount['id'], record?: EntityQueryInput<IdentityProviderAccount>, options?: APIRequestOptions): Promise<EntityRecordResponse<IdentityProviderAccount>>;

    delete(id: IdentityProviderAccount['id'], options?: APIRequestOptions): Promise<EntityRecordResponse<IdentityProviderAccount>>;
}
