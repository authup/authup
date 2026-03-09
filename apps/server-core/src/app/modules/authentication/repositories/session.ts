/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Session } from '@authup/core-kit';
import type { ICache } from '@authup/server-kit';
import { buildCacheKey } from '@authup/server-kit';
import type { Repository } from 'typeorm';
import type { ISessionRepository } from '../../../../core/index.ts';
import { AuthenticationCachePrefix } from './constants.ts';

type SessionRepositoryContext = {
    repository: Repository<Session>,
    cache: ICache
};

export class SessionRepository implements ISessionRepository {
    protected cache : ICache;

    protected repository : Repository<Session>;

    // -----------------------------------------------------

    constructor(ctx: SessionRepositoryContext) {
        this.cache = ctx.cache;
        this.repository = ctx.repository;
    }

    // -----------------------------------------------------

    async findOneById(id: string): Promise<Session | null> {
        const session = await this.cache.get<Session>(
            buildCacheKey({ prefix: AuthenticationCachePrefix.SESSION, key: id }),
        );

        if (session) {
            return session;
        }

        return this.repository.findOneBy({
            id,
        });
    }

    // -----------------------------------------------------

    async save(input: Partial<Session>): Promise<Session> {
        const session = this.repository.create(input);
        await this.repository.save(session);

        await this.cache.set(
            buildCacheKey({ prefix: AuthenticationCachePrefix.SESSION, key: session.id }),
            session,
            {
                ttl: new Date(session.expires_at).getTime() - Date.now(),
            },
        );

        return session;
    }

    // -----------------------------------------------------

    async remove(session: Session): Promise<void> {
        await this.repository.remove(session);
        await this.cache.drop(
            buildCacheKey({ prefix: AuthenticationCachePrefix.SESSION, key: session.id }),
        );
    }

    async removeById(id: string): Promise<void> {
        const session = await this.findOneById(id);

        if (session) {
            await this.remove(session);
        }
    }
}
