/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityType } from '@authup/core-kit';
import type { DomainEventDestinations, IDomainEventPublisher } from '@authup/server-kit';
import type { ObjectLiteral } from 'typeorm';

export type EntitySubscriberCacheContext<T extends ObjectLiteral> = {
    keys: (data: T) => string[],
    onInsert?: boolean,
};

export type EntitySubscriberContext<T extends ObjectLiteral> = {
    type: `${EntityType}`,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    target: Function,
    destinations: (data: T) => DomainEventDestinations,
    cache?: EntitySubscriberCacheContext<T>,
    publisher?: IDomainEventPublisher,
};
