/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICache, Logger } from '@authup/server-kit';
import type { IComponent } from 'ergos';
import { defineScheduledComponent } from 'ergos';
import type { Session } from '@authup/core-kit';
import type { DataSource } from 'typeorm';
import { SessionEntity } from '../../adapters/database/domains/index.ts';
import { SessionRepository } from '../../app/modules/authentication/repositories/session.ts';
import { SessionTokenRepositoryAdapter } from '../../app/modules/oauth2/repositories/session-token/repository.ts';

export function createOAuth2CleanerComponent(
    dataSource: DataSource,
    cache: ICache,
    logger?: Logger,
) : IComponent {
    // Both sweeps run through the repository layer, which owns the
    // batching: an unbounded predicate DELETE on either table would be
    // one long transaction, issued by every replica once a minute.
    const sessionRepository = new SessionRepository({
        repository: dataSource.getRepository<Session>(SessionEntity),
        cache,
    });
    const sessionTokenRepository = new SessionTokenRepositoryAdapter(dataSource);

    return defineScheduledComponent({
        name: 'oauth2-cleaner',
        schedule: '* * * * *',
        logger,
        run: async () => {
            const isoDate = new Date().toISOString();

            // Sweep expired session-token rows first: the auth_session_tokens
            // volume dominates (one row per access token, ~15min TTL) and a
            // deleted session cascade-drops its remaining rows anyway.
            await sessionTokenRepository.deleteExpired(isoDate);

            await sessionRepository.deleteExpired(isoDate);
        },
    });
}
