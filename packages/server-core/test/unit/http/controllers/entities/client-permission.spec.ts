/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll, beforeAll, describe, expect, it,
} from 'vitest';
import type {
    ClientPermission,
} from '@authup/core-kit';

import { createTestApplication } from '../../../../app';
import { createFakeClient, createFakePermission, expectPropertiesEqualToSrc } from '../../../../utils';

describe('src/http/controllers/client-permission', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.start();
    });

    afterAll(async () => {
        await suite.stop();
    });

    let entity : ClientPermission | undefined;

    it('should create resource', async () => {
        const client = await suite.client.client.create(createFakeClient());
        const permission = await suite.client.permission.create(createFakePermission());

        entity = await suite.client
            .clientPermission
            .create({
                client_id: client.id,
                permission_id: permission.id,
            });

        expect(entity.client_id).toEqual(client.id);
        expect(entity.permission_id).toEqual(permission.id);
    });

    it('should read collection', async () => {
        const response = await suite.client
            .clientPermission
            .getMany();

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should read resource', async () => {
        const response = await suite.client
            .clientPermission
            .getOne(entity.id);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(entity, response, ['client', 'permission']);
    });

    it('should delete resource', async () => {
        const response = await suite.client
            .clientPermission
            .delete(entity.id);

        expect(response.id).toBeDefined();
    });
});
