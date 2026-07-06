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
     * Revoke every session of the actor except (optionally) the current one
     * ("log out my other devices"). Self-service — no permission required.
     */
    deleteManyForActor(actor: ActorContext, currentSessionId?: string): Promise<SessionDeleteManyResult>;
}
