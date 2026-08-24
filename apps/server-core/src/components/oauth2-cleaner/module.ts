/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ScheduledTask } from 'node-cron';
import cron from 'node-cron';
import type { ICache, Logger } from '@authup/server-kit';
import type { Session } from '@authup/core-kit';
import type { DataSource } from 'typeorm';
import { SessionEntity } from '../../adapters/database/domains/index.ts';
import { SessionRepository } from '../../app/modules/authentication/repositories/session.ts';
import { SessionTokenRepositoryAdapter } from '../../app/modules/oauth2/repositories/session-token/repository.ts';
import type { Component } from '../types.ts';

export function createOAuth2CleanerComponent(
    dataSource: DataSource,
    cache: ICache,
    logger?: Logger,
) : Component {
    let task : ScheduledTask | undefined;
    let stopped = false;

    return {
        async start() {
            // Both sweeps run through the repository layer, which owns the
            // batching: an unbounded predicate DELETE on either table would be
            // one long transaction, issued by every replica once a minute.
            const sessionRepository = new SessionRepository({
                repository: dataSource.getRepository<Session>(SessionEntity),
                cache,
            });
            const sessionTokenRepository = new SessionTokenRepositoryAdapter(dataSource);

            // A failed sweep must never take the process down (start() is
            // fire-and-forget → an uncaught rejection is fatal on modern
            // node); the next tick simply retries.
            const execute = async () => {
                try {
                    const isoDate = new Date().toISOString();

                    // Sweep expired session-token rows first: the auth_session_tokens
                    // volume dominates (one row per access token, ~15min TTL) and a
                    // deleted session cascade-drops its remaining rows anyway.
                    await sessionTokenRepository.deleteExpired(isoDate);

                    await sessionRepository.deleteExpired(isoDate);
                } catch (e) {
                    logger?.warn('Sweeping expired sessions failed.');
                    logger?.warn(e);
                }
            };

            await execute();

            if (stopped) {
                return;
            }

            task = cron.schedule('* * * * *', async () => {
                await execute();
            });
        },
        async stop() {
            stopped = true;

            if (task) {
                await task.stop();
                task = undefined;
            }
        },
    };
}
