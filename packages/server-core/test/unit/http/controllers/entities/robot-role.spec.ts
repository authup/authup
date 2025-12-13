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
    RobotRole,
} from '@authup/core-kit';
import {
    createFakeRobot, createFakeRole, expectPropertiesEqualToSrc,
} from '../../../../utils';
import { createTestApplication } from '../../../../app';

describe('src/http/controllers/robot-role', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.start();
    });

    afterAll(async () => {
        await suite.stop();
    });

    let entity : RobotRole | undefined;

    it('should create resource', async () => {
        const robot = await suite.client.robot.create(createFakeRobot());
        const role = await suite.client.role.create(createFakeRole());

        entity = await suite.client
            .robotRole
            .create({
                robot_id: robot.id,
                role_id: role.id,
            });

        expect(entity).toBeDefined();
        expect(entity.robot_id).toEqual(robot.id);
        expect(entity.role_id).toEqual(role.id);
    });

    it('should read collection', async () => {
        const response = await suite.client
            .robotRole
            .getMany();

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should read resource', async () => {
        const response = await suite.client
            .robotRole
            .getOne(entity.id);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(entity, response, ['robot', 'role']);
    });

    it('should delete resource', async () => {
        const response = await suite.client
            .robotRole
            .delete(entity.id);

        expect(response.id).toBeDefined();
    });
});
