/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Session } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult } from '@authup/server-kit';

export type SessionDeleteManyResult = {
    count: number,
};

export type SessionDeleteManyOptions = {
    /**
     * The parsed request query. When it carries a recognized target filter
     * (`SESSION_FILTER_KEYS`, e.g. `filter[user_id]`) the call is an admin
     * bulk revoke; otherwise it is the self-service path.
     */
    query?: Record<string, any>,
    /**
     * The caller's current session id (from the bearer). Preserved on the
     * self-service path so "log out my other devices" keeps this device.
     */
    currentSessionId?: string,
};

export interface ISessionService {
    /**
     * List sessions. An actor without `SESSION_READ` is scoped to its own
     * sessions (self-service); an actor with `SESSION_READ` sees every session
     * its realm reach permits.
     */
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<Session>>;

    /**
     * Read a single session by id. Own sessions need no permission.
     */
    getOne(id: string, actor: ActorContext): Promise<Session>;

    /**
     * Revoke (delete) a single session by id. Own sessions need no permission.
     */
    delete(id: string, actor: ActorContext): Promise<Session>;

    /**
     * Bulk revoke.
     *
     * - **No recognized target filter** → self-service: revoke every session of
     *   the actor except the current one ("log out my other devices"). No
     *   permission required.
     * - **A recognized target filter** (`SESSION_FILTER_KEYS`, e.g.
     *   `filter[user_id]`, `filter[realm_id]`) → admin "force-logout": revoke
     *   every matching session. Requires `SESSION_DELETE`, and each session is
     *   additionally realm-matched (drop-unauthorized), so a `realm_admin` only
     *   revokes sessions in its reach and filter breadth cannot escalate.
     */
    deleteMany(actor: ActorContext, options?: SessionDeleteManyOptions): Promise<SessionDeleteManyResult>;
}
