/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SessionToken } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult } from '@authup/server-kit';

export type SessionTokenDeleteManyResult = {
    count: number
};

export interface ISessionTokenService {
    /**
     * List issued tokens. An actor without `SESSION_READ` is scoped to the
     * tokens of its own sessions; an actor with it sees what its realm reach
     * permits.
     */
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<SessionToken>>;

    /**
     * Read one token row by its jti. Own tokens need no permission.
     */
    getOne(id: string, actor: ActorContext): Promise<SessionToken>;

    /**
     * REVOKE one token. Own tokens need no permission.
     *
     * Revoke, not delete: the row is stamped `revokedAt` and the jti is
     * blocklisted in cache. Dropping the row would block refresh (the row is
     * the authority for refresh validity since plan 016) while leaving an
     * already-issued access token verifying against a stateless JWKS adapter
     * until its own expiry.
     */
    delete(id: string, actor: ActorContext): Promise<SessionToken>;

    /**
     * Revoke every token matching a query. This is what "sign out of this
     * application" needs: scoped to one client it leaves the session alive, so
     * the other applications riding it stay signed in.
     *
     * Requires a recognized target filter, so it can never degenerate into an
     * unscoped mass revoke.
     */
    deleteMany(query: Record<string, any>, actor: ActorContext): Promise<SessionTokenDeleteManyResult>;
}
