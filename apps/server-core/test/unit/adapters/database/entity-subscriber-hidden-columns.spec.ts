/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { Client, User } from '@authup/core-kit';
import type { DomainEventPublishContext, IDomainEventPublisher } from '@authup/server-kit';
import type { InsertEvent, UpdateEvent } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { ClientSubscriber } from '../../../../src/adapters/database/domains/client/subscriber.ts';
import { UserSubscriber } from '../../../../src/adapters/database/domains/user/subscriber.ts';

function createPublisherSpy() {
    const calls : DomainEventPublishContext[] = [];

    const publisher : IDomainEventPublisher = {
        async publish(ctx) {
            calls.push(ctx);
        },
        async safePublish(ctx) {
            calls.push(ctx);
        },
    };

    return { calls, publisher };
}

describe('EntitySubscriber hidden columns', () => {
    it('never publishes a select:false column of a client', async () => {
        const { calls, publisher } = createPublisherSpy();

        const subscriber = new ClientSubscriber();
        subscriber.setPublisher(publisher);

        const entity = {
            id: randomUUID(),
            realmId: randomUUID(),
            name: 'app',
            authMethod: 'secret',
            secret: 'plain-secret',
            secretHashed: false,
            secretEncrypted: false,
        } as Client;

        await subscriber.afterInsert({ entity, connection: {} } as unknown as InsertEvent<Client>);

        expect(calls).toHaveLength(1);
        expect(calls[0].content.data.secret).toBeUndefined();
        expect(calls[0].content.data.name).toEqual('app');
        expect(JSON.stringify(calls[0])).not.toContain('plain-secret');

        // the saved entity is what the caller answers with, so it stays intact
        expect(entity.secret).toEqual('plain-secret');
    });

    it('never publishes a select:false column of a user, on either side of an update', async () => {
        const { calls, publisher } = createPublisherSpy();

        const subscriber = new UserSubscriber();
        subscriber.setPublisher(publisher);

        const build = (suffix: string) => ({
            id: randomUUID(),
            realmId: randomUUID(),
            name: 'alice',
            email: `alice-${suffix}@example.com`,
            password: `$2b$10$hash-${suffix}`,
            resetHash: `reset-${suffix}`,
            activateHash: `activate-${suffix}`,
        } as User);

        await subscriber.afterUpdate({
            entity: build('next'),
            databaseEntity: build('previous'),
            connection: {},
        } as unknown as UpdateEvent<User>);

        expect(calls).toHaveLength(1);

        const [ctx] = calls;
        for (const key of ['email', 'password', 'resetHash', 'activateHash']) {
            expect(ctx.content.data[key]).toBeUndefined();
            expect(ctx.dataPrevious?.[key]).toBeUndefined();
        }

        expect(ctx.content.data.name).toEqual('alice');
        expect(JSON.stringify(ctx)).not.toMatch(/hash-|reset-|activate-|@example\.com/);
    });
});
