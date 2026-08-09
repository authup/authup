/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import type { IdentityProviderAccount } from '@authup/core-kit';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';

export interface IIdentityProviderAccountAPI {
    getMany(data?: EntityQueryInput<IdentityProviderAccount>): Promise<EntityCollectionResponse<IdentityProviderAccount>>;

    getOne(id: IdentityProviderAccount['id'], record?: EntityQueryInput<IdentityProviderAccount>): Promise<EntityRecordResponse<IdentityProviderAccount>>;

    delete(id: IdentityProviderAccount['id']): Promise<EntityRecordResponse<IdentityProviderAccount>>;
}
