/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    UserRole,
} from '@authup/core-kit';
import {
    createFakeRole,
    createFakeUser,
    createTestSuite,
    expectPropertiesEqualToSrc,
} from '../../../../utils';

describe('src/http/controllers/user-role', () => {
    const suite = createTestSuite();

    beforeAll(async () => {
        await suite.up();
    });

    afterAll(async () => {
        await suite.down();
    });

    let details : UserRole | undefined;

    it('should create resource', async () => {
        const user = await suite.client.user.create(createFakeUser());
        const role = await suite.client.role.create(createFakeRole());

        details = await suite.client
            .userRole
            .create({
                user_id: user.id,
                role_id: role.id,
            });

        expect(details.user_id).toEqual(user.id);
        expect(details.role_id).toEqual(role.id);
    });

    it('should read collection', async () => {
        const response = await suite.client
            .userRole
            .getMany();

        expect(response.data).toBeDefined();
        expect(response.data.length).toEqual(2);
    });

    it('should read resource', async () => {
        const response = await suite.client
            .userRole
            .getOne(details.id);

        expect(response).toBeDefined();
        expectPropertiesEqualToSrc(details, response, ['user', 'role']);
    });

    it('should delete resource', async () => {
        const response = await suite.client
            .userRole
            .getOne(details.id);

        expect(response.id).toEqual(details.id);
    });
});
