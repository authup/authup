/*
 * Copyright (c) 2026.
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
import { OAuth2ErrorCode } from '@authup/specs';
import { UserEntity } from '../../../../../../src/adapters/database/domains/user/entity.ts';
import { createFakeUser, expectClientError } from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

/**
 * A deactivation written straight to the row (provisioning MERGEs the admin
 * this way) revokes no session, so the token endpoint itself must stop the
 * refresh chain and report the subject's tokens inactive.
 */
describe('token endpoint and a deactivated subject', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    const login = async () => {
        const password = 'deactivation-spec-password';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));
        const token = await suite.client.token.createWithPassword({ username: user.name, password });
        return { user, token };
    };

    const deactivate = (id: string) => suite.dataSource
        .getRepository(UserEntity)
        .save({ id, active: false });

    it('refuses to refresh the tokens of a deactivated user', async () => {
        const { user, token } = await login();
        await deactivate(user.id);

        await expectClientError(
            () => suite.client.token.createWithRefreshToken({ refresh_token: token.refresh_token! }),
            { status: 400, data: { error: OAuth2ErrorCode.INVALID_GRANT } },
        );
    });

    it('reports the access token of a deactivated user inactive', async () => {
        const { user, token } = await login();
        await deactivate(user.id);

        const response = await suite.client.token.introspect(
            { token: token.access_token },
            { authorizationHeaderInherit: true },
        );
        expect(response.active).toBe(false);
        expect(response.permissions).toBeUndefined();
    });

    it('reports an access token inactive once its session is gone', async () => {
        const { token } = await login();

        const before = await suite.client.token.introspect(
            { token: token.access_token },
            { authorizationHeaderInherit: true },
        );
        expect(before.active).toBe(true);

        await suite.client.session.delete(before.session_id!);

        const after = await suite.client.token.introspect(
            { token: token.access_token },
            { authorizationHeaderInherit: true },
        );
        expect(after.active).toBe(false);
    });
});
