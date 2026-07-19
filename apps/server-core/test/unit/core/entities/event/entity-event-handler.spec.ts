/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import {
    EntityType,
    EventName,
    EventScope,
    IdentityType,
} from '@authup/core-kit';
import type { DomainEventPublishContext } from '@authup/server-kit';
import { 
    beforeEach, 
    describe, 
    expect, 
    it, 
} from 'vitest';
import { EntityEventHandler } from '../../../../../src/core/entities/event/entity-event-handler.ts';
import type { EventRequestContext } from '../../../../../src/core/entities/event/types.ts';
import { FakeEventService } from '../../helpers/index.ts';

const entityId = randomUUID();
const realmId = randomUUID();
const actorId = randomUUID();

const requestContext: EventRequestContext = {
    actorType: IdentityType.USER,
    actorId,
    actorName: 'admin',
    requestPath: '/roles',
    requestMethod: 'POST',
    requestIpAddress: '127.0.0.1',
    requestUserAgent: 'vitest',
};

type PublishContextInput = {
    content?: Partial<DomainEventPublishContext['content']>,
    destinations?: DomainEventPublishContext['destinations'],
    dataPrevious?: Record<string, any>,
};

function buildPublishContext(input: PublishContextInput = {}): DomainEventPublishContext {
    const { content, ...rest } = input;

    return {
        content: {
            type: 'role',
            event: 'created',
            data: { id: entityId, realmId },
            ...content,
        },
        destinations: [],
        ...rest,
    };
}

describe('EntityEventHandler', () => {
    let eventService: FakeEventService;

    beforeEach(() => {
        eventService = new FakeEventService();
    });

    function buildHandler(
        options: { requestContext?: () => EventRequestContext | undefined, retentionDays?: number } = {},
    ): EntityEventHandler {
        return new EntityEventHandler({
            eventService,
            requestContext: options.requestContext,
            options: typeof options.retentionDays === 'undefined' ?
                undefined :
                { retentionDays: options.retentionDays },
        });
    }

    it.each([
        ['created', EventName.CREATED],
        ['updated', EventName.UPDATED],
        ['deleted', EventName.DELETED],
    ])('maps the bus event %s onto the audit taxonomy', async (busEvent, expected) => {
        await buildHandler().handle(buildPublishContext({ content: { event: busEvent } }));

        expect(eventService.recordCalls).toHaveLength(1);
        expect(eventService.recordCalls[0].scope).toEqual(EventScope.ENTITY);
        expect(eventService.recordCalls[0].name).toEqual(expected);
    });

    it('carries ref/realm attribution from the published entity', async () => {
        await buildHandler().handle(buildPublishContext());

        const [call] = eventService.recordCalls;
        expect(call.refType).toEqual('role');
        expect(call.refId).toEqual(entityId);
        expect(call.realmId).toEqual(realmId);
    });

    it.each([
        [EntityType.CLIENT_PERMISSION, 'clientRealmId'],
        [EntityType.CLIENT_ROLE, 'clientRealmId'],
        [EntityType.CLIENT_SCOPE, 'clientRealmId'],
        [EntityType.IDENTITY_PROVIDER_ACCOUNT, 'userRealmId'],
        [EntityType.IDENTITY_PROVIDER_ATTRIBUTE_MAPPING, 'providerRealmId'],
        [EntityType.IDENTITY_PROVIDER_PERMISSION_MAPPING, 'providerRealmId'],
        [EntityType.IDENTITY_PROVIDER_ROLE_MAPPING, 'providerRealmId'],
        [EntityType.PERMISSION_POLICY, 'permissionRealmId'],
        [EntityType.ROLE_PERMISSION, 'roleRealmId'],
        [EntityType.USER_PERMISSION, 'userRealmId'],
        [EntityType.USER_ROLE, 'userRealmId'],
    ])('attributes %s events to the canonical owner realm', async (type, key) => {
        await buildHandler().handle(buildPublishContext({
            content: {
                type,
                data: {
                    id: entityId,
                    [key]: realmId,
                },
            },
        }));

        expect(eventService.recordCalls[0].realmId).toEqual(realmId);
    });

    it('attributes realm events to the realm itself', async () => {
        await buildHandler().handle(buildPublishContext({
            content: {
                type: EntityType.REALM,
                data: { id: realmId },
            },
        }));

        expect(eventService.recordCalls[0].realmId).toEqual(realmId);
    });

    it('preserves a null owner realm instead of using the member realm', async () => {
        await buildHandler().handle(buildPublishContext({
            content: {
                type: EntityType.ROLE_PERMISSION,
                data: {
                    id: entityId,
                    roleRealmId: null,
                    permissionRealmId: realmId,
                },
            },
        }));

        expect(eventService.recordCalls[0].realmId).toBeNull();
    });

    it('falls back to the previous owner realm for a partial update payload', async () => {
        await buildHandler().handle(buildPublishContext({
            content: {
                type: EntityType.USER_ROLE,
                event: 'updated',
                data: { id: entityId },
            },
            dataPrevious: {
                id: entityId,
                userRealmId: realmId,
            },
        }));

        expect(eventService.recordCalls[0].realmId).toEqual(realmId);
    });

    it('stamps actor/request fields from the injected request context', async () => {
        await buildHandler({ requestContext: () => requestContext }).handle(buildPublishContext());

        const [call] = eventService.recordCalls;
        expect(call.actorType).toEqual(IdentityType.USER);
        expect(call.actorId).toEqual(actorId);
        expect(call.actorName).toEqual('admin');
        expect(call.requestPath).toEqual('/roles');
        expect(call.requestMethod).toEqual('POST');
        expect(call.requestIpAddress).toEqual('127.0.0.1');
        expect(call.requestUserAgent).toEqual('vitest');
    });

    it('falls back to null actor/request fields without a request context (system semantics)', async () => {
        await buildHandler().handle(buildPublishContext());

        const [call] = eventService.recordCalls;
        expect(call.actorType).toBeNull();
        expect(call.actorId).toBeNull();
        expect(call.actorName).toBeNull();
        expect(call.requestPath).toBeNull();
        expect(call.requestMethod).toBeNull();
        expect(call.requestIpAddress).toBeNull();
        expect(call.requestUserAgent).toBeNull();
    });

    it('falls back to null actor/request fields when the getter resolves undefined (non-HTTP write)', async () => {
        await buildHandler({ requestContext: () => undefined }).handle(buildPublishContext());

        const [call] = eventService.recordCalls;
        expect(call.actorId).toBeNull();
        expect(call.requestPath).toBeNull();
    });

    it('produces a diff for updated events carrying a previous snapshot', async () => {
        await buildHandler().handle(buildPublishContext({
            content: {
                event: 'updated',
                data: {
                    id: entityId, 
                    realmId, 
                    description: 'after', 
                },
            },
            dataPrevious: {
                id: entityId, 
                realmId, 
                description: 'before', 
            },
        }));

        const [call] = eventService.recordCalls;
        expect(call.data).toEqual({ diff: { description: { next: 'after', previous: 'before' } } });
    });

    it('records null data for an updated event without a previous snapshot', async () => {
        await buildHandler().handle(buildPublishContext({ content: { event: 'updated' } }));

        expect(eventService.recordCalls[0].data).toBeNull();
    });

    it('records null data when the diff comes out empty', async () => {
        await buildHandler().handle(buildPublishContext({
            content: {
                event: 'updated',
                data: {
                    id: entityId, 
                    realmId, 
                    description: 'same', 
                },
            },
            dataPrevious: {
                id: entityId, 
                realmId, 
                description: 'same', 
            },
        }));

        expect(eventService.recordCalls[0].data).toBeNull();
    });

    it('records null data for created and deleted events (no column dumps)', async () => {
        const handler = buildHandler();
        await handler.handle(buildPublishContext({ content: { event: 'created', data: { id: entityId, name: 'some-role' } } }));
        await handler.handle(buildPublishContext({ content: { event: 'deleted', data: { id: entityId, name: 'some-role' } } }));

        expect(eventService.recordCalls).toHaveLength(2);
        expect(eventService.recordCalls[0].data).toBeNull();
        expect(eventService.recordCalls[1].data).toBeNull();
    });

    it('records an updated event whose content carries no data (diff skipped, no throw)', async () => {
        const handler = buildHandler();
        await handler.handle(buildPublishContext({
            content: { event: 'updated', data: undefined },
            dataPrevious: { id: entityId, name: 'previous' },
        }));

        expect(eventService.recordCalls).toHaveLength(1);
        expect(eventService.recordCalls[0].data).toBeNull();
        expect(eventService.recordCalls[0].refId).toBeNull();
    });

    it('ignores publishes for the event entity itself (recursion guard)', async () => {
        await buildHandler().handle(buildPublishContext({ content: { type: 'event' } }));

        expect(eventService.recordCalls).toHaveLength(0);
    });

    it('ignores unknown bus event names', async () => {
        await buildHandler().handle(buildPublishContext({ content: { event: 'custom' } }));

        expect(eventService.recordCalls).toHaveLength(0);
    });

    it('forwards the configured retention override', async () => {
        await buildHandler({ retentionDays: 7 }).handle(buildPublishContext());

        expect(eventService.recordCalls[0].retentionDays).toEqual(7);
    });

    it('leaves the retention undefined without an override (service default applies)', async () => {
        await buildHandler().handle(buildPublishContext());

        expect(eventService.recordCalls[0].retentionDays).toBeUndefined();
    });

    it('never throws, even when the event service does', async () => {
        eventService.record = async () => {
            throw new Error('record blew up');
        };

        await expect(buildHandler().handle(buildPublishContext())).resolves.toBeUndefined();
    });
});
