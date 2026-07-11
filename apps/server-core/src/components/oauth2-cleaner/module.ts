/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import cron from 'node-cron';
import type { Logger } from '@authup/server-kit';
import type { DataSource } from 'typeorm';
import { LessThan } from 'typeorm';
import { SessionEntity, SessionTokenEntity } from '../../adapters/database/domains/index.ts';
import type { Component } from '../types.ts';

export function createOAuth2CleanerComponent(
    dataSource: DataSource,
    logger?: Logger,
) : Component {
    return {
        async start() {
            const sessionRepository = dataSource.getRepository(SessionEntity);
            const sessionTokenRepository = dataSource.getRepository(SessionTokenEntity);

            // A failed sweep must never take the process down (start() is
            // fire-and-forget → an uncaught rejection is fatal on modern
            // node); the next tick simply retries.
            const execute = async () => {
                try {
                    const isoDate = new Date().toISOString();

                    // Sweep expired session-token rows first: the auth_session_tokens
                    // volume dominates (one row per access token, ~15min TTL) and a
                    // deleted session cascade-drops its remaining rows anyway.
                    await sessionTokenRepository
                        .delete({ expires_at: LessThan(isoDate) });

                    await sessionRepository
                        .delete({ expires_at: LessThan(isoDate) });
                } catch (e) {
                    logger?.warn('Sweeping expired sessions failed.');
                    logger?.warn(e);
                }
            };

            await execute();

            cron.schedule('* * * * *', async () => {
                await execute();
            });
        },
    };
}
