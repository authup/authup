/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { EventName } from '@authup/core-kit';
import {
    contains,
    inArray,
    or,
} from '@rapiq/core';
import { createTestApplication } from '../../../../app';

describe('src/http/controllers/event (label search branch)', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should decode the kit label-search branch for events', async () => {
        const names = [EventName.LOGIN_FAILED, EventName.MFA_VERIFIED];

        const { data } = await suite.client.event.getMany({ filters: or(contains('name', 'Failed sign-in'), inArray('name', names)) });

        for (const item of data) {
            expect(names).toContain(item.name);
        }
    });
});
