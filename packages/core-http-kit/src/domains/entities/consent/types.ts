/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import type { Consent } from '@authup/core-kit';
import type { IEntitySchemaAPI } from '../../stats';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';

export interface IConsentAPI extends IEntitySchemaAPI {
    getMany(data?: EntityQueryInput<Consent>): Promise<EntityCollectionResponse<Consent>>;

    getOne(id: Consent['id'], record?: EntityQueryInput<Consent>): Promise<EntityRecordResponse<Consent>>;

    delete(id: Consent['id']): Promise<EntityRecordResponse<Consent>>;
}
