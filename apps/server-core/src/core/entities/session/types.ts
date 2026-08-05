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

export type SessionGetManyOptions = {
    /**
     * Restrict to sessions that issued a token for one of these clients
     * (`?usedClientId=`). The read counterpart of the same option on
     * `SessionDeleteManyOptions`, so an operator can list what a revoke
     * would reach before running it.
     */
    clientIds?: string[],
};

export type SessionDeleteManyOptions = {
    /**
     * The parsed request query. When it carries a recognized target filter
     * (`SESSION_FILTER_KEYS`, e.g. `filter[userId]`) the call is an admin
     * bulk revoke; otherwise it is the self-service path.
     */
    query?: Record<string, any>,
    /**
     * The caller's current session id (from the bearer). Preserved on the
     * self-service path so "log out my other devices" keeps this device.
     */
    currentSessionId?: string,
    /**
     * Restrict to sessions that ISSUED A TOKEN for one of these clients
     * (`?usedClientId=`). This is the "revoke application X everywhere"
     * target, and it reaches every session the client actually served,
     * which `filter[clientId]` cannot: that column names only the client
     * that FIRST authorized on the row, while one browser session serves
     * several applications.
     *
     * Deliberately a request parameter rather than a rapiq filter. Reading
     * intent out of a user-supplied condition tree would have to decide
     * what a negated or OR-nested `clientId` means, and on a bulk delete a
     * wrong answer is a mass deletion. A scalar parameter has one meaning.
     *
     * Its presence alone selects the admin bulk-revoke path (SESSION_DELETE
     * plus the per-session realm match), exactly like a target filter.
     */
    clientIds?: string[],
};

export interface ISessionService {
    /**
     * List sessions. An actor without `SESSION_READ` is scoped to its own
     * sessions (self-service); an actor with `SESSION_READ` sees every session
     * its realm reach permits.
     */
    getMany(
        query: Record<string, any>,
        actor: ActorContext,
        options?: SessionGetManyOptions,
    ): Promise<EntityRepositoryFindManyResult<Session>>;

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
     *   `filter[userId]`, `filter[realmId]`) → admin "force-logout": revoke
     *   every matching session. Requires `SESSION_DELETE`, and each session is
     *   additionally realm-matched (drop-unauthorized), so a `realm_admin` only
     *   revokes sessions in its reach and filter breadth cannot escalate.
     */
    deleteMany(actor: ActorContext, options?: SessionDeleteManyOptions): Promise<SessionDeleteManyResult>;
}
