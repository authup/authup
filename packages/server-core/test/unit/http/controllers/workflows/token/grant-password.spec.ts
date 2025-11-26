/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import {
    afterAll, beforeAll, describe, expect, it,
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import { isClientError } from 'hapic';
import { createFakeUser, createTestSuite } from '../../../../../utils';

describe('src/http/controllers/token', () => {
    const suite = createTestSuite();

    beforeAll(async () => {
        await suite.up();
    });

    afterAll(async () => {
        await suite.down();
    });

    it('should grant token with password', async () => {
        const response = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
            });

        expect(response).toBeDefined();
        expect(response.access_token).toBeDefined();
        expect(response.expires_in).toBeDefined();
        expect(response.refresh_token).toBeDefined();
    });

    it('should not grant token with password grant (credentials invalid)', async () => {
        const credentials = {
            username: 'test',
            password: 'foo-bar-baz',
        };

        try {
            await suite.client
                .token
                .createWithPassword(credentials);
        } catch (e) {
            if (isClientError(e)) {
                expect(e.status)
                    .toEqual(400);
                expect(e.response.data.code)
                    .toEqual(ErrorCode.ENTITY_CREDENTIALS_INVALID);
            }
        }
    });

    it('should not grant token with password grant (inactive)', async () => {
        const entity = await suite.client.user.create(createFakeUser({
            password: 'foo-bar-baz',
            active: false,
        }));

        try {
            await suite.client
                .token
                .createWithPassword({
                    username: entity.name,
                    password: 'foo-bar-baz',
                });
        } catch (e) {
            if (isClientError(e)) {
                expect(e.status).toEqual(400);
                expect(e.response.data.code).toEqual(ErrorCode.ENTITY_INACTIVE);
            }
        }

        await suite.client.user.update(entity.id, {
            active: true,
        });

        const response = await suite.client
            .token
            .createWithPassword({
                username: entity.name,
                password: 'foo-bar-baz',
            });

        expect(response).toBeDefined();

        try {
            await suite.client
                .token
                .createWithPassword({
                    username: entity.name,
                    password: 'foo',
                });
        } catch (e) {
            if (isClientError(e)) {
                expect(e.status).toEqual(400);
                expect(e.response.data.code).toEqual(ErrorCode.ENTITY_CREDENTIALS_INVALID);
            }
        }
    });
});
