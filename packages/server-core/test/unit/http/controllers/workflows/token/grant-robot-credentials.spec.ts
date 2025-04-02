/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Robot } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import { isClientError } from 'hapic';
import { createFakeRobot, createTestSuite } from '../../../../../utils';

describe('refresh-token', () => {
    const suite = createTestSuite();

    let robot : Robot;

    beforeAll(async () => {
        await suite.up();

        robot = await suite.client.robot.create(createFakeRobot());
    });

    afterAll(async () => {
        await suite.down();
    });

    it('should grant token with robot credentials', async () => {
        const response = await suite.client
            .token
            .createWithRobotCredentials({
                id: robot.id,
                secret: robot.secret,
            });

        expect(response.access_token).toBeDefined();
        expect(response.expires_in).toBeDefined();
        expect(response.refresh_token).toBeUndefined();
    });

    it('should not grant with robot-credentials (inactive)', async () => {
        await suite.client.robot.update(robot.id, {
            active: false,
        });

        expect.assertions(2);

        try {
            await suite.client
                .token
                .createWithRobotCredentials(robot);
        } catch (e) {
            if (isClientError(e)) {
                expect(e.status).toEqual(400);
                expect(e.response.data.code).toEqual(ErrorCode.ENTITY_INACTIVE);
            }
        }
    });

    it('should not grant with robot-credentials (invalid credentials)', async () => {
        await suite.client.robot.update(robot.id, {
            active: true,
        });

        expect.assertions(2);

        try {
            await suite.client
                .token
                .createWithRobotCredentials({
                    ...robot,
                    secret: 'foo',
                });
        } catch (e) {
            if (isClientError(e)) {
                expect(e.status).toEqual(400);
                expect(e.response.data.code).toEqual(ErrorCode.ENTITY_CREDENTIALS_INVALID);
            }
        }
    });
});
