/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { readFromLocations } from '../../../../../src/adapters/http/request';
import { createFakeEvent } from './fake-event';

describe('readFromLocations', () => {
    it('should read from a single location', async () => {
        const event = createFakeEvent({ body: { a: 1 } });
        await expect(readFromLocations(event, ['body'])).resolves.toEqual({ a: 1 });
    });

    it('should aggregate distinct keys across locations', async () => {
        const event = createFakeEvent({
            body: { a: 1 },
            query: { b: 2 },
            params: { c: '3' },
            cookies: { d: '4' },
        });
        await expect(
            readFromLocations(event, ['body', 'query', 'params', 'cookies']),
        ).resolves.toEqual({
            a: 1,
            b: 2,
            c: '3',
            d: '4',
        });
    });

    it('should let a later location override an earlier one on key collision', async () => {
        const event = createFakeEvent({
            body: { realm_id: 'from-body' },
            query: { realm_id: 'from-query' },
        });
        await expect(readFromLocations(event, ['body', 'query'])).resolves.toEqual({ realm_id: 'from-query' });
        await expect(readFromLocations(event, ['query', 'body'])).resolves.toEqual({ realm_id: 'from-body' });
    });

    it('should return an empty object when locations yield nothing', async () => {
        await expect(readFromLocations(createFakeEvent(), ['body', 'query'])).resolves.toEqual({});
    });
});
