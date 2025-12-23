/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Session } from '@authup/core-kit';
import { IdentityType } from '@authup/core-kit';
import { AuthupError } from '@authup/errors';
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

        if (!input.id) {
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
        }
        return this.repository.save(input);
    }

    async ping(session: Session): Promise<Session> {
        const seenAt = new Date(session.seen_at).getTime();
        const threshold = seenAt + (5 * 1_000);

        if (threshold < Date.now()) {
            return session;
        }

        session.seen_at = new Date().toISOString();

        return this.repository.save(session);
    }

    // -----------------------------------------------------

    async refresh(session: Session): Promise<Session> {
        session.refreshed_at = new Date().toISOString();
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
     */
    async verify(id: string): Promise<Session> {
        const entity = await this.repository.findOneById(id);
        if (!entity) {
            // todo: better error
            throw new AuthupError('Session does not exist');
        }

        const ms = new Date(entity.expires_at).getTime();
        if (Date.now() > ms) {
            await this.repository.remove(entity);

            // todo: better error
            throw new AuthupError('The session has expired');
        }

        return entity;
    }
}
