/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TrustAnchor } from '@authup/core-kit';
import type { BuildInput } from 'rapiq';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';

export type TrustAnchorCreatePayload = Pick<TrustAnchor, 'name' | 'certificate'> &
    Partial<Pick<TrustAnchor, 'enabled' | 'realmId'>>;
export type TrustAnchorUpdatePayload = Partial<Pick<TrustAnchor, 'name' | 'enabled'>>;

export interface ITrustAnchorAPI {
    getMany(data?: BuildInput<TrustAnchor>): Promise<EntityCollectionResponse<TrustAnchor>>;

    getOne(id: TrustAnchor['id'], record?: BuildInput<TrustAnchor>): Promise<EntityRecordResponse<TrustAnchor>>;

    create(data: TrustAnchorCreatePayload): Promise<EntityRecordResponse<TrustAnchor>>;

    update(id: TrustAnchor['id'], data: TrustAnchorUpdatePayload): Promise<EntityRecordResponse<TrustAnchor>>;

    delete(id: TrustAnchor['id']): Promise<EntityRecordResponse<TrustAnchor>>;
}
