/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isClientError } from 'hapic';
import { useConfig } from '../../../../../../src';
import { createTestSuite } from '../../../../../utils';

describe('src/http/controllers/auth/handlers/*.ts', () => {
    const suite = createTestSuite();

    beforeAll(async () => {
        await suite.up();
    });

    afterAll(async () => {
        await suite.down();
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
