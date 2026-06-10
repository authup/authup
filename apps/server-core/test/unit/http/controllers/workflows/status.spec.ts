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
import { createTestApplication } from '../../../../app';

describe('src/http/controllers/workflows/status/*.ts', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should return version, date and feature flags', async () => {
        const response = await suite.client.status.get();

        expect(typeof response.version).toEqual('string');
        expect(typeof response.date).toEqual('string');

        // the test application factory enables all three workflows
        expect(response.features).toEqual({
            registration: true,
            passwordRecovery: true,
            emailVerification: true,
        });
    });
});
