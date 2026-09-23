/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IDomainEventPublisher } from '@authup/server-kit';
import type { DataSource } from 'typeorm';
import type { DatabaseLockOptions } from 'typeorm-extension';
import { TypedToken } from 'eldin';
import type { IEventRepository, IEventService } from '../../../core/index.ts';

export const DatabaseInjectionKey = {
    DataSource: new TypedToken<DataSource>('DataSource'),
    DomainEventPublisher: new TypedToken<IDomainEventPublisher>('DomainEventPublisher'),
    EventRepository: new TypedToken<IEventRepository>('EventRepository'),
    EventService: new TypedToken<IEventService>('EventService'),
} as const;

/**
 * How a boot pass waits for a database lock. It throws a `DatabaseLockError`
 * after 60s rather than running unlocked. `strict: false` runs the callback
 * unlocked on better-sqlite3, which has no lock: one database file per
 * container means a second replica cannot reach it.
 */
export const DATABASE_LOCK_OPTIONS = { timeout: 60_000, strict: false } satisfies DatabaseLockOptions;

/**
 * The mutex a boot-time migration run holds against every other. The name must
 * stay STABLE across releases, for the reason `PROVISIONING_DATABASE_LOCK`
 * gives.
 */
export const MIGRATION_DATABASE_LOCK = 'authup:migration';
