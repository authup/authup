/*
 * Copyright (c) 2021-2024.
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
import type { ClientRole } from '@authup/core-kit';
import { createFakeClient, createFakeRole, expectPropertiesEqualToSrc } from '../../../../utils';
import { createTestApplication } from '../../../../app';

describe('src/http/controllers/client-role', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    let entity : ClientRole | undefined;

    it('should create resource', async () => {
        const { data: client } = await suite.client.client.create(createFakeClient());
        const { data: role } = await suite.client.role.create(createFakeRole());

        entity = (await suite.client
            .clientRole
            .create({
                clientId: client.id,
                roleId: role.id,
            })).data;

        expect(entity).toBeDefined();
        expect(entity.clientId).toEqual(client.id);
        expect(entity.roleId).toEqual(role.id);
    });

    it('should read collection', async () => {
        const response = await suite.client
            .clientRole
            .getMany();

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should read resource', async () => {
        const { data: response } = await suite.client
            .clientRole
            .getOne(entity!.id);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(entity!, response, ['client', 'role']);
    });

    it('should delete resource', async () => {
        const { data: response } = await suite.client
            .clientRole
            .delete(entity!.id);

        expect(response.id).toBeDefined();
    });
});
