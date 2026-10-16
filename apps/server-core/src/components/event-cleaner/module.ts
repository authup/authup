/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Event } from '@authup/core-kit';
import type { Logger } from '@authup/server-kit';
import type { IScheduledComponent } from 'hubwire';
import { defineScheduledComponent } from 'hubwire';
import type { DataSource } from 'typeorm';
import { EventEntity } from '../../adapters/database/domains/index.ts';
import { EventRepositoryAdapter } from '../../app/modules/database/repositories/index.ts';

export function createEventCleanerComponent(
    dataSource: DataSource,
    logger?: Logger,
) : IScheduledComponent {
    const repository = new EventRepositoryAdapter(
        dataSource.getRepository<Event>(EventEntity),
    );

    return defineScheduledComponent({
        schedule: '* * * * *',
        hooks: {
            onError: (e) => {
                logger?.warn('Component event-cleaner pass failed.');
                logger?.warn(e);
            },
        },
        // Rows carry a per-row expires_at stamped at write time from
        // eventLogRetentionDays; null = keep forever.
        run: async () => {
            await repository.deleteExpired(new Date().toISOString());
        },
    });
}
