/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    RobotRole,
} from '@authup/common';
import { createSuperTestRobot, createSuperTestRole } from '../../../utils/domains';
import { expectPropertiesEqualToSrc } from '../../../utils/properties';
import { useSuperTest } from '../../../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../../../utils/database/connection';

describe('src/http/controllers/robot-role', () => {
    const superTest = useSuperTest();

    beforeAll(async () => {
        await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();
    });

    const details : Partial<RobotRole> = {};

    it('should create resource', async () => {
        const { body: robot } = await createSuperTestRobot(superTest);
        const { body: role } = await createSuperTestRole(superTest);

        const response = await superTest
            .post('/robot-roles')
            .send({
                robot_id: robot.id,
                role_id: role.id,
            })
            .auth('admin', 'start123');

        expect(response.status).toEqual(201);
        expect(response.body).toBeDefined();

        details.id = response.body.id;
        details.robot_id = response.body.robot_id;
        details.role_id = response.body.role_id;
    });

    it('should read collection', async () => {
        const response = await superTest
            .get('/robot-roles')
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.data).toBeDefined();
        expect(response.body.data.length).toEqual(1);
    });

    it('should read resource', async () => {
        const response = await superTest
            .get(`/robot-roles/${details.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);
    });

    it('should delete resource', async () => {
        const response = await superTest
            .delete(`/robot-roles/${details.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(202);
    });
});
