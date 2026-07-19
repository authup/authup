/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import type { Event } from '@authup/core-kit';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';

/**
 * Read-only client — the audit log is append-only: rows are written
 * server-side at the emit points and pruned by the retention sweep.
 */
export interface IEventAPI {
    getMany(data?: EntityQueryInput<Event>): Promise<EntityCollectionResponse<Event>>;

    getOne(id: Event['id'], record?: EntityQueryInput<Event>): Promise<EntityRecordResponse<Event>>;
}
