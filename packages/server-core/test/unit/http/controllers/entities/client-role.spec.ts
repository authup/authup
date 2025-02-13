/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    ClientRole,
} from '@authup/core-kit';
import {
    createFakeClient, createFakeRole, createTestSuite, expectPropertiesEqualToSrc,
} from '../../../../utils';

describe('src/http/controllers/client-role', () => {
    const suite = createTestSuite();

    beforeAll(async () => {
        await suite.up();
    });

    afterAll(async () => {
        await suite.down();
    });

    let entity : ClientRole | undefined;

    it('should create resource', async () => {
        const client = await suite.client.client.create(createFakeClient());
        const role = await suite.client.role.create(createFakeRole());

        entity = await suite.client
            .clientRole
            .create({
                client_id: client.id,
                role_id: role.id,
            });

        expect(entity).toBeDefined();
        expect(entity.client_id).toEqual(client.id);
        expect(entity.role_id).toEqual(role.id);
    });

    it('should read collection', async () => {
        const response = await suite.client
            .clientRole
            .getMany();

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should read resource', async () => {
        const response = await suite.client
            .clientRole
            .getOne(entity.id);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(entity, response, ['client', 'role']);
    });

    it('should delete resource', async () => {
        const response = await suite.client
            .clientRole
            .delete(entity.id);

        expect(response.id).toBeDefined();
    });
});
