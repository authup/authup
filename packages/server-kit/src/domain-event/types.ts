/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EventPayload } from '@authup/core-realtime-kit';

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
    destinations: DomainEventDestinations,
    /**
     * Pre-mutation snapshot of the entity for `updated` events. Lives on the
     * publish CONTEXT (never inside `content`): `content` is the shared
     * realtime wire payload and must never carry previous state to
     * redis/socket consumers — only in-process handlers (e.g. the audit
     * entity-event bridge) may read it.
     */
    dataPrevious?: Record<string, any>
};

export interface IDomainEventHandler {
    handle(ctx: DomainEventPublishContext) : Promise<void>;

    dispose?() : Promise<void>;
}

export interface IDomainEventPublisher {
    publish(ctx: DomainEventPublishContext) : Promise<void>;

    safePublish(ctx: DomainEventPublishContext) : Promise<void>;
}
