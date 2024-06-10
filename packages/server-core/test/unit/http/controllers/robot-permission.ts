/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    RobotPermission,
} from '@authup/core-kit';
import { createSuperTestPermission, createSuperTestRobot } from '../../../utils/domains';
import { expectPropertiesEqualToSrc } from '../../../utils/properties';
import { useSuperTest } from '../../../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../../../utils/database/connection';

describe('src/http/controllers/robot-permission', () => {
    const superTest = useSuperTest();

    beforeAll(async () => {
        await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();
    });

    const details : Partial<RobotPermission> = {};

    it('should create resource', async () => {
        const { body: robot } = await createSuperTestRobot(superTest);
        const { body: permission } = await createSuperTestPermission(superTest);

        const response = await superTest
            .post('/robot-permissions')
            .send({
                robot_id: robot.id,
                permission_id: permission.id,
            })
            .auth('admin', 'start123');

        expect(response.status).toEqual(201);
        expect(response.body).toBeDefined();

        details.id = response.body.id;
        details.robot_id = response.body.robot_id;
        details.permission_id = response.body.permission_id;
    });

    it('should read collection', async () => {
        const response = await superTest
            .get('/robot-permissions')
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.data).toBeDefined();
        expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should read resource', async () => {
        const response = await superTest
            .get(`/robot-permissions/${details.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);
    });

    it('should delete resource', async () => {
        const response = await superTest
            .delete(`/robot-permissions/${details.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(202);
    });
});
