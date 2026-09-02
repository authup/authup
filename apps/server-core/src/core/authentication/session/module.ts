/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Session } from '@authup/core-kit';
import { IdentityType } from '@authup/core-kit';
import { JWTError } from '@authup/specs';
import type { IOAuth2BackchannelLogoutNotifier } from '../../oauth2/backchannel-logout/types.ts';
import type {
    ISessionManager, 
    ISessionRepository, 
    SessionManagerContext, 
    SessionManagerOptions,
} from './types.ts';

export class SessionManager implements ISessionManager {
    protected options: SessionManagerOptions;

    protected repository: ISessionRepository;

    protected backchannelLogoutNotifier?: IOAuth2BackchannelLogoutNotifier;

    // -----------------------------------------------------

    constructor(ctx: SessionManagerContext) {
        this.options = ctx.options;
        this.repository = ctx.repository;
        this.backchannelLogoutNotifier = ctx.backchannelLogoutNotifier;
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
        const session = await this.repository.findOneById(id);
        if (!session) {
            return;
        }

        // The audience is read BEFORE the row goes: it derives from the
        // session's token rows, which cascade-delete with it. Delivery waits
        // until AFTER, so a client is never told about a session that still
        // exists.
        const clients = this.backchannelLogoutNotifier ?
            await this.backchannelLogoutNotifier.resolve(session) :
            [];

        // A copy goes to the repository: TypeORM unsets the primary key on
        // the entity it removed, and the notifier still needs `sid`.
        await this.repository.remove({ ...session });

        if (this.backchannelLogoutNotifier && clients.length > 0) {
            await this.backchannelLogoutNotifier.notify(session, clients);
        }
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
