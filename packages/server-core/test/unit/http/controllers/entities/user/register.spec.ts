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
import { createTestSuite } from '../../../../../utils';

describe('src/http/controllers/auth/handlers/*.ts', () => {
    const suite = createTestSuite();

    beforeAll(async () => {
        await suite.up();
    });

    afterAll(async () => {
        await suite.down();
    });

    it('should not register a new user', async () => {
        expect.assertions(1);

        const config = useConfig();
        config.registration = false;

        try {
            await suite.client
                .user
                .register({
                    name: 'test',
                    email: 'test@example.com',
                    password: 'my-password',
                });
        } catch (e) {
            if (isClientError(e)) {
                expect(e.status).toEqual(400);
            }
        }
    });

    it('should register a new user', async () => {
        const config = useConfig();

        config.registration = true;
        config.emailVerification = true;

        const response = await suite.client
            .user
            .register({
                name: 'test',
                email: 'test@example.com',
                password: 'my-password',
            });

        expect(response.name).toEqual('test');
        expect(response.email).toEqual('test@example.com');
        expect(response.id).toBeDefined();
        expect(response.created_at).toBeDefined();
        expect(response.updated_at).toBeDefined();
    });
});
