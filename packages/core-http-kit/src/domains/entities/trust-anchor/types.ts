/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TrustAnchor } from '@authup/core-kit';
import type { EntityQueryInput } from '../../../helpers';
import type { EntityCollectionResponse, EntityRecordWrappedResponse } from '../../types-base';

export type TrustAnchorCreatePayload = Pick<TrustAnchor, 'name' | 'certificate'> &
    Partial<Pick<TrustAnchor, 'enabled' | 'realmId'>>;
export type TrustAnchorUpdatePayload = Partial<Pick<TrustAnchor, 'name' | 'enabled'>>;

export interface ITrustAnchorAPI {
    getMany(data?: EntityQueryInput<TrustAnchor>): Promise<EntityCollectionResponse<TrustAnchor>>;

    getOne(id: TrustAnchor['id'], record?: EntityQueryInput<TrustAnchor>): Promise<EntityRecordWrappedResponse<TrustAnchor>>;

    create(data: TrustAnchorCreatePayload): Promise<EntityRecordWrappedResponse<TrustAnchor>>;

    update(id: TrustAnchor['id'], data: TrustAnchorUpdatePayload): Promise<EntityRecordWrappedResponse<TrustAnchor>>;

    delete(id: TrustAnchor['id']): Promise<EntityRecordWrappedResponse<TrustAnchor>>;
}
