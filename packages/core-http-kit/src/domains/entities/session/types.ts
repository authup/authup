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
     * Revoke sessions in bulk.
     *
     * - No argument → revoke every session of the current identity except the
     *   one this request authenticates with ("log out my other devices").
     * - `{ userId }` → admin force-logout: revoke every session of the target
     *   user on all devices (requires `SESSION_DELETE` + realm reach).
     */
    deleteMany(options?: { userId?: string }): Promise<SessionDeleteManyResponse>;
}
