/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Event } from '@authup/core-kit';
import type { Logger } from '@authup/server-kit';
import type { IComponent } from 'ergos';
import { defineScheduledComponent } from 'ergos';
import type { DataSource } from 'typeorm';
import { EventEntity } from '../../adapters/database/domains/index.ts';
import { EventRepositoryAdapter } from '../../app/modules/database/repositories/index.ts';

export function createEventCleanerComponent(
    dataSource: DataSource,
    logger?: Logger,
) : IComponent {
    const repository = new EventRepositoryAdapter(
        dataSource.getRepository<Event>(EventEntity),
    );

    return defineScheduledComponent({
        name: 'event-cleaner',
        schedule: '* * * * *',
        logger,
        // Rows carry a per-row expires_at stamped at write time from
        // eventLogRetentionDays; null = keep forever.
        run: async () => {
            await repository.deleteExpired(new Date().toISOString());
        },
    });
}
