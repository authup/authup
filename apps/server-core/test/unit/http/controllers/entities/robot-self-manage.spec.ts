/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Robot as RobotEntity } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { Client as HTTPClient } from '@authup/core-http-kit';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createTestApplication } from '../../../../app';
import { createFakeRobot } from '../../../../utils';

describe('http/controllers/robot (self-manage)', () => {
    const suite = createTestApplication();

    let entity: RobotEntity;
    let selfClient: HTTPClient;
    const knownSecret = 'robot-self-manage-secret-123';

    beforeAll(async () => {
        await suite.setup();

        const created = await suite.client.robot.create({
            ...createFakeRobot(),
            secret: knownSecret,
        });
        entity = created;

        const permission = await suite.client.permission.getOne(PermissionName.ROBOT_SELF_MANAGE);
        await suite.client.robotPermission.create({
            robot_id: entity.id,
            permission_id: permission.id,
        });

        const tokenResponse = await suite.client.token.createWithRobotCredentials({
            id: entity.id,
            secret: knownSecret,
        });

        selfClient = new HTTPClient({ baseURL: suite.baseURL });
        selfClient.setAuthorizationHeader({
            type: 'Bearer',
            token: tokenResponse.access_token,
        });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should allow robot to update its own description (not in denylist)', async () => {
        const response = await selfClient.robot.update(entity.id, { description: 'self-described' });

        expect(response.description).toBe('self-described');
    });

    it('should allow robot to update its own display_name (not in denylist)', async () => {
        const response = await selfClient.robot.update(entity.id, { display_name: 'self-renamed' });

        expect(response.display_name).toBe('self-renamed');
    });

    it('should allow robot to rotate its own secret (not in denylist)', async () => {
        const response = await selfClient.robot.update(entity.id, { secret: 'rotated-robot-secret' });

        expect(response.secret).toBeDefined();
    });

    it('should reject self-update of active flag (denylisted)', async () => {
        await expect(
            selfClient.robot.update(entity.id, { active: false } as Partial<RobotEntity>),
        ).rejects.toThrow();
    });

    it('should silently strip self-update of realm_id (validator drops on UPDATE)', async () => {
        const originalRealmId = entity.realm_id;
        const response = await selfClient.robot.update(entity.id, { realm_id: '00000000-0000-0000-0000-000000000000' } as Partial<RobotEntity>);

        expect(response.realm_id).toBe(originalRealmId);
    });

    it('should reject self-update of user_id (denylisted)', async () => {
        // user_id is mounted in the validator (both CREATE and UPDATE), so it
        // reaches the policy. The denylist rejects it. (The validateJoinColumns
        // step may also reject if the UUID is non-existent — either way, no
        // rebinding to a different owner.)
        await expect(
            selfClient.robot.update(entity.id, { user_id: '00000000-0000-0000-0000-000000000000' } as Partial<RobotEntity>),
        ).rejects.toThrow();
    });

    it('should reject self-update of another robot (not self)', async () => {
        const otherRobot = await suite.client.robot.create(createFakeRobot());

        await expect(
            selfClient.robot.update(otherRobot.id, { description: 'hijacked' }),
        ).rejects.toThrow();
    });
});
