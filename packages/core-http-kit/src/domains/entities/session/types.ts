/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import type { Session } from '@authup/core-kit';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';

export type SessionDeleteManyResponse = {
    count: number,
};

export interface ISessionAPI {
    getMany(data?: BuildInput<Session>): Promise<EntityCollectionResponse<Session>>;

    getOne(id: Session['id'], record?: BuildInput<Session>): Promise<EntityRecordResponse<Session>>;

    delete(id: Session['id']): Promise<EntityRecordResponse<Session>>;

    /**
     * Revoke sessions in bulk (mirrors `getMany`'s query shape).
     *
     * - No argument → revoke every session of the current identity except the
     *   one this request authenticates with ("log out my other devices").
     * - A target `filter` (e.g. `{ filter: { userId } }`, `{ filter: { realmId } }`)
     *   → admin force-logout: revoke every matching session (requires
     *   `SESSION_DELETE` + per-session realm reach). `filter[userId]` accepts a
     *   comma list to target multiple subjects at once.
     */
    deleteMany(data?: BuildInput<Session>): Promise<SessionDeleteManyResponse>;
}
