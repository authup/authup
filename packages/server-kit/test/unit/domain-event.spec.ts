/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { DomainEventPublisher } from '../../src';
import type { DomainEventPublishContext } from '../../src';

const ctx : DomainEventPublishContext = {
    content: {
        type: 'user',
        event: 'created',
        data: { id: '1' },
    },
    destinations: [],
};

function createPublisher() {
    const received : string[] = [];
    const publisher = new DomainEventPublisher();

    publisher.register({
        async handle() {
            throw new Error('first');
        },
    });
    publisher.register({
        async handle() {
            throw new Error('second');
        },
    });
    publisher.register({
        async handle() {
            received.push('last');
        },
    });

    return { publisher, received };
}

describe('DomainEventPublisher', () => {
    it('runs every handler when an earlier one fails and rejects with the first error', async () => {
        const { publisher, received } = createPublisher();

        await expect(publisher.publish(ctx)).rejects.toThrow('first');
        expect(received).toEqual(['last']);
    });

    it('reaches every handler through safePublish', async () => {
        const { publisher, received } = createPublisher();

        await publisher.safePublish(ctx);
        expect(received).toEqual(['last']);
    });
});
