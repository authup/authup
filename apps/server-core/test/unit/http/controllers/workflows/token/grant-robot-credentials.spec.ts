/*
 * Copyright (c) 2024.
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
import type { Robot } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import { createFakeRobot, expectClientError } from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

describe('refresh-token', () => {
    const suite = createTestApplication();

    let robot : Robot;

    beforeAll(async () => {
        await suite.setup();

        robot = await suite.client.robot.create(createFakeRobot());
    });

    afterAll(async () => {
        await suite.teardown();
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
        await suite.client.robot.update(robot.id, { active: false });

        await expectClientError(
            () => suite.client.token.createWithRobotCredentials(robot as any),
            { status: 400, code: ErrorCode.ENTITY_INACTIVE },
        );
    });

    it('should not grant with robot-credentials (invalid credentials)', async () => {
        await suite.client.robot.update(robot.id, { active: true });

        await expectClientError(
            () => suite.client.token.createWithRobotCredentials({
                ...robot,
                secret: 'foo',
            } as any),
            { status: 400, code: ErrorCode.ENTITY_CREDENTIALS_INVALID },
        );
    });
});
