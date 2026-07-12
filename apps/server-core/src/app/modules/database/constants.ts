/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IDomainEventPublisher } from '@authup/server-kit';
import type { DataSource } from 'typeorm';
import { TypedToken } from 'eldin';
import type { IEventRepository, IEventService } from '../../../core/index.ts';

export const DatabaseInjectionKey = {
    DataSource: new TypedToken<DataSource>('DataSource'),
    DomainEventPublisher: new TypedToken<IDomainEventPublisher>('DomainEventPublisher'),
    EventRepository: new TypedToken<IEventRepository>('EventRepository'),
    EventService: new TypedToken<IEventService>('EventService'),
} as const;
