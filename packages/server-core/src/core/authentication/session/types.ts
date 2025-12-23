/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Session } from '@authup/core-kit';

export interface ISessionRepository {
    findOneById(id: string): Promise<Session | null> | null;

    save(session: Partial<Session>): Promise<Session>;

    removeById(id: string): Promise<void>;

    remove(session: Session) : Promise<void>;
}

export type SessionManagerOptions = {
    /**
     * Max age in seconds (sec).
     */
    maxAge: number
};

export type SessionManagerContext = {
    options: SessionManagerOptions,
    repository: ISessionRepository,
};

export interface ISessionManager {
    /**
     * Create new session.
     *
     * @param session
     */
    create(session: Partial<Session>): Promise<Session>;

    /**
     * Updates seen_at with current time.
     *
     * @param session
     */
    ping(session: Session) : Promise<Session>;

    /**
     * Updates refreshed_at, seen_at with current time.
     *
     * @param session
     */
    refresh(session: Session) : Promise<Session>;

    /**
     * Check if session exists and is valid.
     *
     * @param id
     */
    verify(id: string): Promise<Session>;
}
