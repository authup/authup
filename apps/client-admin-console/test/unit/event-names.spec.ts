/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EventStatsResponse } from '@authup/core-http-kit';
import type { Event as EventEntity } from '@authup/core-kit';
import { EventName, EventScope } from '@authup/core-kit';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountPage } from '../utils';

// chart.js measures its canvas, which happy-dom cannot lay out.
vi.mock('../../src/components/dashboard/EventVolumeChart.vue', async () => {
    const { defineComponent } = await import('vue');

    return { default: defineComponent({ render: () => null }) };
});

const EVENT_ID = '7a1d4b2c-3e5f-4a6b-8c9d-0e1f2a3b4c5d';

const now = new Date(0).toISOString();

function buildEvent(input: Partial<EventEntity>) : EventEntity {
    return {
        id: EVENT_ID,
        scope: EventScope.IDENTITY,
        name: EventName.LOGIN_FAILED,
        refType: null,
        refId: null,
        clientId: null,
        sessionId: null,
        actorType: null,
        actorId: null,
        actorName: null,
        requestPath: null,
        requestMethod: null,
        requestIpAddress: null,
        requestUserAgent: null,
        realmId: null,
        data: null,
        expiring: false,
        expiresAt: null,
        createdAt: now,
        ...input,
    };
}

describe('event names', () => {
    it('should render the localized event name in the /events list with the raw scope and name beside it', async () => {
        const events = [
            buildEvent({ id: '1', name: EventName.LOGIN_FAILED }),
            buildEvent({
                id: '2',
                scope: EventScope.ENTITY,
                name: EventName.CREATED,
            }),
        ];

        const { wrapper } = await mountPage('/events', {
            'GET /events': () => ({
                data: events,
                meta: {
                    total: events.length,
                    limit: 10,
                    offset: 0,
                },
            }),
        });

        const cells = wrapper.findAll('tbody tr').map((row) => row.find('td'));

        expect(cells).toHaveLength(2);
        expect(cells[0].find('.leading-tight').element.firstChild?.textContent?.trim()).toEqual('Failed sign-in');
        expect(cells[0].find('.text-fg-muted').text()).toEqual(`${EventScope.IDENTITY}.${EventName.LOGIN_FAILED}`);
        expect(cells[1].find('.leading-tight').element.firstChild?.textContent?.trim()).toEqual('Created');
        expect(cells[1].find('.text-fg-muted').text()).toEqual(`${EventScope.ENTITY}.${EventName.CREATED}`);
    });

    it('should match the localized event name when searching the /events list', async () => {
        const { wrapper, httpClient } = await mountPage('/events', {
            'GET /events': () => ({
                data: [],
                meta: {
                    total: 0,
                    limit: 10,
                    offset: 0,
                },
            }),
        });

        await wrapper.find('input[type="text"]').setValue('Failed sign-in');
        await new Promise((resolve) => {
            setTimeout(resolve, 250);
        });
        await flushPromises();

        const filters = httpClient.requests
            .map((request) => new URL(request.url, 'http://fake.test'))
            .filter((url) => url.pathname === '/events')
            .map((url) => url.searchParams.get('filter'));

        expect(filters.at(-1)).toEqual(`or(contains(name,'Failed sign-in'),in(name,'${EventName.LOGIN_FAILED}'))`);
    });

    it('should lead the /events/:id heading with the localized name and keep the raw name under it', async () => {
        const { wrapper } = await mountPage(`/events/${EVENT_ID}`, {
            [`GET /events/${EVENT_ID}`]: () => ({
                data: buildEvent({ name: EventName.LOGIN_FAILED }),
                meta: {},
            }),
        });

        expect(wrapper.find('h1').text()).toEqual('Failed sign-in');
        expect(wrapper.find('.sub-title').text()).toEqual(EventName.LOGIN_FAILED);
    });

    it('should rank events on the dashboard under their localized name with the raw scope and name beside it', async () => {
        const response : EventStatsResponse = {
            data: [
                {
                    createdAt: '2026-09-22T00:00:00.000Z',
                    scope: EventScope.OAUTH2,
                    name: EventName.LOGIN,
                    count: 3,
                },
            ],
            meta: {
                from: '2026-09-15T00:00:00.000Z',
                to: '2026-09-22T10:00:00.000Z',
                bucket: 'day',
                total: 3,
                enabled: true,
                retentionDays: 90,
                entityRetentionDays: 7,
                aggregateFrom: null,
                entityAggregateFrom: null,
                schema: {} as EventStatsResponse['meta']['schema'],
            },
        };

        const { wrapper } = await mountPage('/', { 'GET /events/@stats': () => response });

        const entry = wrapper.find('li');

        expect(entry.find('small').text()).toEqual(`${EventScope.OAUTH2}.${EventName.LOGIN}`);
        expect(entry.find('span').text()).toEqual(`Sign-in ${EventScope.OAUTH2}.${EventName.LOGIN}`);
    });
});
