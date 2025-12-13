/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll, beforeAll, describe, expect, it,
} from 'vitest';
import { isClientError } from 'hapic';
import { useConfig } from '../../../../../../src';
import { createTestApplication } from '../../../../../app';

describe('src/http/controllers/auth/handlers/*.ts', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.start();
    });

    afterAll(async () => {
        await suite.stop();
    });

    it('should attempt password reset for user', async () => {
        const config = useConfig();

        config.registration = false;

        try {
            await suite.client
                .user
                .passwordForgot({
                    name: 'admin',
                });
        } catch (e) {
            if (isClientError(e)) {
                expect(e.status).toEqual(400);
            }
        }
    });

    it('should attempt password reset for user', async () => {
        const config = useConfig();

        config.registration = true;
        config.emailVerification = true;

        const response = await suite.client
            .user
            .passwordForgot({
                name: 'admin',
            });

        expect(response).toBeDefined();
    });
});
