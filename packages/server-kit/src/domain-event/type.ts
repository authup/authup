/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EventPayload } from '@authup/schema';

export type DomainEventChannelName = string | ((id?: string | number) => string);
export type DomainEventDestination = {
    namespace?: string,
    channel: DomainEventChannelName
};

export type DomainEventDestinations = DomainEventDestination[];

export type DomainEventPublishContext<
    T extends EventPayload = EventPayload,
> = {
    content: T,
    destinations: DomainEventDestinations
};

export interface IDomainEventPublisher {
    publish(ctx: DomainEventPublishContext) : Promise<void>;
}
