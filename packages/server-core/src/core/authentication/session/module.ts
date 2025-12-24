/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Session } from '@authup/core-kit';
import { IdentityType } from '@authup/core-kit';
import { JWTError } from '@authup/specs';
import type {
    ISessionManager, ISessionRepository, SessionManagerContext, SessionManagerOptions,
} from './types';

export class SessionManager implements ISessionManager {
    protected options: SessionManagerOptions;

    protected repository: ISessionRepository;

    // -----------------------------------------------------

    constructor(ctx: SessionManagerContext) {
        this.options = ctx.options;
        this.repository = ctx.repository;
    }

    // -----------------------------------------------------

    /**
     * Create/Update session
     *
     * @param input
     */
    async create(input: Partial<Session>): Promise<Session> {
        input.ip_address = input.ip_address || '127.0.0.1';
        input.user_agent = input.user_agent || 'system';
        input.expires_at = input.expires_at || new Date(
            Date.now() + (this.options.maxAge * 1_000),
        ).toISOString();

        switch (input.sub_kind) {
            case IdentityType.CLIENT: {
                input.client_id = input.sub;
                break;
            }
            case IdentityType.ROBOT: {
                input.robot_id = input.sub;
                break;
            }
            case IdentityType.USER: {
                input.user_id = input.sub;
                break;
            }
        }

        return this.repository.save(input);
    }

    // -----------------------------------------------------

    async ping(session: Session): Promise<Session> {
        if (session.seen_at) {
            const seenAt = new Date(session.seen_at).getTime();
            const threshold = seenAt + (5 * 1_000);

            if (threshold > Date.now()) {
                return session;
            }
        }

        session.seen_at = new Date().toISOString();

        return this.repository.save(session);
    }

    // -----------------------------------------------------

    async refresh(session: Session): Promise<Session> {
        const now = new Date().toISOString();
        session.refreshed_at = now;
        session.seen_at = now;

        session.expires_at = new Date(
            Date.now() + (this.options.maxAge * 1_000),
        ).toISOString();

        return this.repository.save(session);
    }

    // -----------------------------------------------------

    /**
     * Verify session on token inspection/verification.
     *
     * @param id
     * @throws JWTError
     */
    async findOneById(id: string): Promise<Session | null> {
        return this.repository.findOneById(id);
    }

    // -----------------------------------------------------

    async verify(session: Session): Promise<void> {
        const ms = new Date(session.expires_at).getTime();
        if (Date.now() > ms) {
            await this.repository.remove(session);

            // todo: better error
            throw JWTError.expired();
        }
    }
}
