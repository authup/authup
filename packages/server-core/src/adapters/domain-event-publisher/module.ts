/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DomainEventPublishContext } from '@authup/server-kit';
import { DomainEventPublisher } from '@authup/server-kit';
import { singa } from 'singa';

const singleton = singa<DomainEventPublisher>({
    name: 'domainEvent',
    factory() {
        return new DomainEventPublisher();
    },
});

export function useDomainEventPublisher() {
    return singleton.use();
}

export async function publishDomainEvent(ctx: DomainEventPublishContext) : Promise<void> {
    await useDomainEventPublisher()
        .publish(ctx);
}
