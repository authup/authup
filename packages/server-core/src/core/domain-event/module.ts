/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DomainEventPublishContext } from '@authup/server-kit';
import { DomainEventPublisher } from '@authup/server-kit';
import { hasConfig, useClient } from 'redis-extension';
import { singa } from 'singa';

const singleton = singa<DomainEventPublisher>({
    name: 'domainEvent',
    factory() {
        if (!hasConfig()) {
            throw new Error('The redis client is not configured.');
        }

        return new DomainEventPublisher(useClient());
    },
});

export function useDomainEventPublisher() {
    return singleton.use();
}

export async function publishDomainEvent(ctx: DomainEventPublishContext) : Promise<void> {
    if (!hasConfig()) {
        return;
    }

    await useDomainEventPublisher()
        .publish(ctx);
}
