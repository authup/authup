/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Session } from '@authup/core-kit';
import { IdentityType } from '@authup/core-kit';
import { AuthupError } from '@authup/errors';
import type { ISessionManager, ISessionRepository } from './types';

export class SessionManager implements ISessionManager {
    protected repository: ISessionRepository;

    // -----------------------------------------------------

    constructor(repository: ISessionRepository) {
        this.repository = repository;
    }

    // -----------------------------------------------------

    /**
     * Create/Update session
     *
     * @param input
     */
    async save(input: Partial<Session>): Promise<Session> {
        input.ip_address = input.ip_address || '127.0.0.1';
        input.user_agent = input.user_agent || 'system';
        input.expires = input.expires || new Date(
            Date.now() + (3_600 * 24 * 1_000),
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

        const ms = new Date(entity.expires).getTime();
        if (Date.now() > ms) {
            await this.repository.remove(entity);

            // todo: better error
            throw new AuthupError('The session has expired');
        }

        return entity;
    }
}
