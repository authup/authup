/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Session } from '@authup/core-kit';
import { IdentityType } from '@authup/core-kit';
import type { Logger } from '@authup/server-kit';
import { JWTError } from '@authup/specs';
import { SESSION_REVOKE_CONCURRENCY } from './constants.ts';
import type { 
    ISessionManager, 
    ISessionRepository, 
    ISessionRevokeNotifier, 
    SessionManagerContext, 
    SessionManagerOptions, 
    SessionOwner,
} from './types.ts';

export class SessionManager implements ISessionManager {
    protected options: SessionManagerOptions;

    protected repository: ISessionRepository;

    protected revokeNotifier?: ISessionRevokeNotifier;

    protected logger?: Logger;

    // -----------------------------------------------------

    constructor(ctx: SessionManagerContext) {
        this.options = ctx.options;
        this.repository = ctx.repository;
        this.revokeNotifier = ctx.revokeNotifier;
        this.logger = ctx.logger;
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

        return this.repository.update(session, { seenAt: new Date().toISOString() });
    }

    // -----------------------------------------------------

    async refresh(session: Session): Promise<Session> {
        const now = new Date().toISOString();

        return this.repository.update(session, {
            refreshedAt: now,
            seenAt: now,
            expiresAt: new Date(
                Date.now() + (this.options.maxAge * 1_000),
            ).toISOString(),
        });
    }

    // -----------------------------------------------------

    async markMfaVerified(session: Session): Promise<Session> {
        return this.repository.update(session, { mfaAt: new Date().toISOString() });
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
        // exists. A failed read costs the notification, never the removal.
        let clients : Client[] = [];
        if (this.revokeNotifier) {
            try {
                clients = await this.revokeNotifier.resolve(session);
            } catch (e) {
                this.logger?.warn(`Resolving the logout audience of session ${session.id} failed: ${
                    e instanceof Error ? e.message : String(e)
                }`);
            }
        }

        // A copy goes to the repository: TypeORM unsets the primary key on
        // the entity it removed, and the notifier still needs `sid`.
        await this.repository.remove({ ...session });

        if (this.revokeNotifier && clients.length > 0) {
            await this.revokeNotifier.notify(session, clients);
        }
    }

    async revokeByOwner(owner: SessionOwner, exceptId?: string): Promise<string[]> {
        const sessions = await this.repository.findAllByOwner(owner);
        const failed = await this.revokeMany(sessions
            .filter((session) => session.id !== exceptId)
            .map((session) => session.id));

        if (failed.length > 0) {
            this.logger?.error(`${failed.length} session(s) of ${owner.subKind} ${owner.sub} could not be revoked`);
        }

        return failed;
    }

    async revokeMany(ids: string[]): Promise<string[]> {
        const failed : string[] = [];
        for (let i = 0; i < ids.length; i += SESSION_REVOKE_CONCURRENCY) {
            const batch = ids.slice(i, i + SESSION_REVOKE_CONCURRENCY);
            const results = await Promise.allSettled(batch.map((id) => this.revoke(id)));
            for (const [j, result] of results.entries()) {
                if (result.status === 'rejected') {
                    failed.push(batch[j]);
                    this.logger?.warn(`Revoking session ${batch[j]} failed: ${
                        result.reason instanceof Error ? result.reason.message : String(result.reason)
                    }`);
                }
            }
        }

        return failed;
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
