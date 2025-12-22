/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Session } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import type { ISessionRepository } from '../../../../core';

export class SessionRepository implements ISessionRepository {
    protected repository : Repository<Session>;

    // -----------------------------------------------------

    constructor(repository: Repository<Session>) {
        this.repository = repository;
    }

    // -----------------------------------------------------

    findOneById(id: string): Promise<Session | null> | null {
        return this.repository.findOneBy({
            id,
        });
    }

    // -----------------------------------------------------

    save(input: Partial<Session>): Promise<Session> {
        const session = this.repository.create(input);
        return this.repository.save(session);
    }

    // -----------------------------------------------------

    async remove(session: Session): Promise<void> {
        await this.repository.remove(session);
    }

    async removeById(id: string): Promise<void> {
        const session = await this.findOneById(id);

        if (session) {
            await this.remove(session);
        }
    }
}
