/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@authup/kit';
import type { DatabaseRootSeederResult } from '../../../../../src';
import { dropTestDatabase, useTestDatabase } from '../../../../utils/database/connection';
import { updateSuperTestRobot } from '../../../../utils/domains';
import type { TestAgent } from '../../../../utils/supertest';
import { useSuperTest } from '../../../../utils/supertest';

describe('refresh-token', () => {
    let superTest: TestAgent;

    let seederResponse : DatabaseRootSeederResult | undefined;
    let robotCredentials : { id: string, secret: string };

    beforeAll(async () => {
        superTest = useSuperTest();
        seederResponse = await useTestDatabase();
        robotCredentials = {
            id: seederResponse.robot.id,
            secret: seederResponse.robot.secret,
        };
    });

    afterAll(async () => {
        await dropTestDatabase();

        superTest = undefined;
    });

    it('should grant token with robot credentials', async () => {
        const response = await superTest
            .post('/token')
            .send({
                id: seederResponse.robot.id,
                secret: seederResponse.robot.secret,
            });

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.access_token).toBeDefined();
        expect(response.body.expires_in).toBeDefined();
        expect(response.body.refresh_token).toBeUndefined();
    });

    it('should not grant with robot-credentials (inactive)', async () => {
        await updateSuperTestRobot(superTest, seederResponse.robot.id, {
            active: false,
        });

        const response = await superTest
            .post('/token')
            .send(robotCredentials);

        expect(response.status).toEqual(400);
        expect(response.body.code).toEqual(ErrorCode.ENTITY_INACTIVE);
    });

    it('should not grant with robot-credentials (invalid credentials)', async () => {
        await updateSuperTestRobot(superTest, seederResponse.robot.id, { active: true });

        const response = await superTest
            .post('/token')
            .send({
                ...robotCredentials,
                secret: 'foo',
            });

        expect(response.status).toEqual(400);
        expect(response.body.code).toEqual(ErrorCode.CREDENTIALS_INVALID);
    });
});
