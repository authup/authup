/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { IdentityProviderAttribute } from '@authup/core-kit';
import type { DomainEventPublishContext, IDomainEventPublisher } from '@authup/server-kit';
import type { InsertEvent, UpdateEvent } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { IdentityProviderAttributeSubscriber } from '../../../../src/adapters/database/domains/identity-provider-attribute/subscriber.ts';

const attributeId = randomUUID();
const realmId = randomUUID();
const providerId = randomUUID();

function buildAttribute(value: string): IdentityProviderAttribute {
    return {
        id: attributeId,
        name: 'clientSecret',
        value,
        providerId,
        realmId,
    } as IdentityProviderAttribute;
}

function buildUpdateEvent(
    entity: IdentityProviderAttribute,
    databaseEntity: IdentityProviderAttribute,
): UpdateEvent<IdentityProviderAttribute> {
    // The subscriber only reads entity / databaseEntity / connection, and
    // dropCacheKeys returns early without a queryResultCache.
    return {
        entity,
        databaseEntity,
        connection: {},
    } as unknown as UpdateEvent<IdentityProviderAttribute>;
}

function buildInsertEvent(entity: IdentityProviderAttribute): InsertEvent<IdentityProviderAttribute> {
    return {
        entity,
        connection: {},
    } as unknown as InsertEvent<IdentityProviderAttribute>;
}

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

describe('IdentityProviderAttributeSubscriber', () => {
    it('never publishes the attribute value', async () => {
        const { calls, publisher } = createPublisherSpy();

        const subscriber = new IdentityProviderAttributeSubscriber();
        subscriber.setPublisher(publisher);

        await subscriber.afterUpdate(buildUpdateEvent(
            buildAttribute('next-secret'),
            buildAttribute('previous-secret'),
        ));

        expect(calls).toHaveLength(1);

        const [ctx] = calls;
        expect(ctx.content.data.value).toBeNull();
        expect(ctx.dataPrevious?.value).toBeNull();
        expect(JSON.stringify(ctx)).not.toContain('next-secret');
        expect(JSON.stringify(ctx)).not.toContain('previous-secret');

        // the rest of the row still rides, so consumers keep their attribution
        expect(ctx.content.data.id).toEqual(attributeId);
        expect(ctx.content.data.name).toEqual('clientSecret');
    });

    it('never publishes the attribute value on insert', async () => {
        const { calls, publisher } = createPublisherSpy();

        const subscriber = new IdentityProviderAttributeSubscriber();
        subscriber.setPublisher(publisher);

        await subscriber.afterInsert(buildInsertEvent(buildAttribute('fresh-secret')));

        expect(calls).toHaveLength(1);
        expect(calls[0].content.data.value).toBeNull();
        expect(calls[0].dataPrevious).toBeUndefined();
        expect(JSON.stringify(calls[0])).not.toContain('fresh-secret');
    });
});
