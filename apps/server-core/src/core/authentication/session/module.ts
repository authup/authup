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
    ISessionManager, 
    ISessionRepository, 
    SessionManagerContext, 
    SessionManagerOptions,
} from './types.ts';

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
        input.ipAddress = input.ipAddress || '127.0.0.1';
        input.userAgent = input.userAgent || 'system';
        input.expiresAt = input.expiresAt || new Date(
            Date.now() + (this.options.maxAge * 1_000),
        ).toISOString();

        switch (input.subKind) {
            case IdentityType.CLIENT: {
                input.clientId = input.sub;
                break;
            }
            case IdentityType.ROBOT: {
                input.robotId = input.sub;
                break;
            }
            case IdentityType.USER: {
                input.userId = input.sub;
                break;
            }
        }

        return this.repository.save(input);
    }

    // -----------------------------------------------------

    async ping(session: Session): Promise<Session> {
        if (session.seenAt) {
            const seenAt = new Date(session.seenAt).getTime();
            const threshold = seenAt + (5 * 1_000);

            if (threshold > Date.now()) {
                return session;
            }
        }

        session.seenAt = new Date().toISOString();

        return this.repository.save(session);
    }

    // -----------------------------------------------------

    async refresh(session: Session): Promise<Session> {
        const now = new Date().toISOString();
        session.refreshedAt = now;
        session.seenAt = now;

        session.expiresAt = new Date(
            Date.now() + (this.options.maxAge * 1_000),
        ).toISOString();

        return this.repository.save(session);
    }

    // -----------------------------------------------------

    async markMfaVerified(session: Session): Promise<Session> {
        session.mfaAt = new Date().toISOString();

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

    async revoke(id: string): Promise<void> {
        await this.repository.removeById(id);
    }

    // -----------------------------------------------------

    async verify(session: Session): Promise<void> {
        const ms = new Date(session.expiresAt).getTime();
        if (Date.now() > ms) {
            await this.repository.remove(session);

            // todo: better error
            throw JWTError.expired();
        }
    }
}
