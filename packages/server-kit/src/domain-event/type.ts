/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DomainsEventContext } from '@authup/core-kit';

export type DomainEventChannelName = string | ((id?: string | number) => string);
export type DomainEventDestination = {
    namespace?: string,
    channel: DomainEventChannelName
};

export type DomainEventDestinations = DomainEventDestination[];

export type DomainEventPublishContent = {
    type: string,
    event: string,
    data: Record<string, any>
};
export type DomainEventPublishContext<
    T extends DomainEventPublishContent = DomainsEventContext,
> = {
    content: T,
    destinations: DomainEventDestinations
};

export interface IDomainEventPublisher {
    publish(ctx: DomainEventPublishContext) : Promise<void>;
}
