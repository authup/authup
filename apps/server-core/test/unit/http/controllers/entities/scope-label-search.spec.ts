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
import { ScopeName } from '@authup/core-kit';
import {
    and,
    eq,
    inArray,
    or,
} from '@rapiq/core';
import { createTestApplication } from '../../../../app';

describe('src/http/controllers/scope (label search branch)', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should match built-in rows without a display name through the kit label-search branch', async () => {
        const { data } = await suite.client.scope.getMany({
            filters: and(
                inArray('name', [ScopeName.OPEN_ID]),
                eq('builtIn', true),
                or(eq('displayName', null), eq('displayName', '')),
            ),
        });

        expect(data.map((item) => item.name)).toEqual([ScopeName.OPEN_ID]);
    });

    it('should not match a non built-in row', async () => {
        const { data } = await suite.client.scope.getMany({
            filters: and(
                inArray('name', [ScopeName.OPEN_ID]),
                eq('builtIn', false),
            ),
        });

        expect(data).toEqual([]);
    });
});
