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
    RobotPermission,
} from '@authup/core-kit';
import { createFakePermission, createFakeRobot, expectPropertiesEqualToSrc } from '../../../../utils';
import { createTestApplication } from '../../../../app';

describe('src/http/controllers/robot-permission', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.start();
    });

    afterAll(async () => {
        await suite.stop();
    });

    let entity : RobotPermission | undefined;

    it('should create resource', async () => {
        const robot = await suite.client.robot.create(createFakeRobot());
        const permission = await suite.client.permission.create(createFakePermission());

        entity = await suite.client
            .robotPermission
            .create({
                robot_id: robot.id,
                permission_id: permission.id,
            });

        expect(entity.robot_id).toEqual(robot.id);
        expect(entity.permission_id).toEqual(permission.id);
    });

    it('should read collection', async () => {
        const response = await suite.client
            .robotPermission
            .getMany();

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should read resource', async () => {
        const response = await suite.client
            .robotPermission
            .getOne(entity.id);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(entity, response, ['robot', 'permission']);
    });

    it('should delete resource', async () => {
        const response = await suite.client
            .robotPermission
            .delete(entity.id);

        expect(response.id).toBeDefined();
    });
});
