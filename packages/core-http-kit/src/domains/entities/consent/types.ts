/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import type { Consent } from '@authup/core-kit';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';

export interface IConsentAPI {
    getMany(data?: BuildInput<Consent>): Promise<EntityCollectionResponse<Consent>>;

    getOne(id: Consent['id'], record?: BuildInput<Consent>): Promise<EntityRecordResponse<Consent>>;

    delete(id: Consent['id']): Promise<EntityRecordResponse<Consent>>;
}
