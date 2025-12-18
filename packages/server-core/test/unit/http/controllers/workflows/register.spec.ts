/*
 * Copyright (c) 2022-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll, beforeAll, describe, expect, it,
} from 'vitest';
import { createTestApplication } from '../../../../app';

describe('http/controller/register', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.start();
    });

    afterAll(async () => {
        await suite.stop();
    });

    it('should register a new user', async () => {
        const response = await suite.client
            .user
            .register({
                name: 'test',
                email: 'test@example.com',
                password: 'my-password',
            });

        expect(response.active).toBeFalsy();
    });
});
