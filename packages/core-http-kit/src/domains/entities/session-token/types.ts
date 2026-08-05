/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import type { SessionToken } from '@authup/core-kit';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';

export type SessionTokenDeleteManyResponse = {
    count: number,
};

export interface ISessionTokenAPI {
    /**
     * List issued tokens. An actor without `SESSION_READ` sees only the tokens
     * of its own sessions.
     *
     * `filter[sessionId]` lists the applications that rode one session;
     * `filter[clientId]` finds every session an application served, which
     * `sessions`' own `clientId` cannot, since that names only the client that
     * first authorized on the row.
     */
    getMany(data?: EntityQueryInput<SessionToken>): Promise<EntityCollectionResponse<SessionToken>>;

    getOne(
        id: SessionToken['id'],
        record?: EntityQueryInput<SessionToken>
    ): Promise<EntityRecordResponse<SessionToken>>;

    /**
     * Revoke one token by its jti. The row is stamped and the jti is
     * blocklisted; the row is not removed.
     */
    delete(id: SessionToken['id']): Promise<EntityRecordResponse<SessionToken>>;

    /**
     * Revoke every token matching the query.
     *
     * Scoped to one client this is "sign out of this application": the session
     * survives, so the other applications riding it stay signed in. A target
     * filter (`id`, `sessionId` or `clientId`) is REQUIRED — an unscoped call
     * is rejected rather than revoking everything.
     */
    deleteMany(data: EntityQueryInput<SessionToken>): Promise<SessionTokenDeleteManyResponse>;
}
