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
import { Client as HTTPClient } from '@authup/core-http-kit';
import { UserAuthenticatorKind } from '@authup/core-kit';
import { createFakeUser, expectClientError } from '../../../../utils';
import { createTestApplication } from '../../../../app';

describe('src/http/controllers/user-authenticator', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.mfaEnabled = true;
        },
    });

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    async function createUserBearer(password: string): Promise<{ id: string, client: HTTPClient }> {
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));
        const login = await suite.client.token.createWithPassword({
            username: user.name,
            password,
        });
        const client = new HTTPClient({ baseURL: suite.baseURL });
        client.setAuthorizationHeader({ type: 'Bearer', token: login.access_token });
        return { id: user.id, client };
    }

    it('lets an admin list and reset another user\'s devices', async () => {
        const { id: userId, client: userClient } = await createUserBearer('admin-managed-pw');

        // secret-bearing factors are self-enrollment only — the user enrolls
        // their own recovery set (the admin never sees the codes).
        const enrolled = await userClient.userAuthenticator.enroll('@me', { kind: UserAuthenticatorKind.RECOVERY });
        expect(enrolled.meta.codes).toHaveLength(10);
        expect(enrolled.data.userId).toEqual(userId);

        // the admin can list it (secrets nulled) ...
        const list = await suite.client.userAuthenticator.getMany(userId);
        expect(list.data).toHaveLength(1);
        expect(list.data[0].codes ?? null).toBeNull();

        // ... and reset it by deleting (the sanctioned admin management path)
        const { data: deleted } = await suite.client.userAuthenticator.delete(userId, enrolled.data.id);
        expect(deleted.id).toEqual(enrolled.data.id);

        const after = await suite.client.userAuthenticator.getMany(userId);
        expect(after.data).toHaveLength(0);
    });

    it('refuses an admin enrolling an owner-controlled factor for another user', async () => {
        const { id: userId } = await createUserBearer('admin-enroll-block-pw');

        // totp/recovery would disclose the seed/codes to the admin, and a
        // webauthn ceremony can be completed on the admin's own authenticator —
        // all three are self-enrollment only.
        for (const kind of [
            UserAuthenticatorKind.TOTP,
            UserAuthenticatorKind.RECOVERY,
            UserAuthenticatorKind.WEBAUTHN,
        ]) {
            await expectClientError(
                () => suite.client.userAuthenticator.enroll(userId, { kind }),
                { status: 400 },
            );
        }

        // nothing was created on the target
        const list = await suite.client.userAuthenticator.getMany(userId);
        expect(list.data).toHaveLength(0);
    });

    it('denies a non-privileged user access to a foreign user\'s devices', async () => {
        const owner = await createUserBearer('owner-password-1');
        const stranger = await createUserBearer('stranger-password-1');

        const enrolled = await owner.client.userAuthenticator.enroll('@me', { kind: UserAuthenticatorKind.RECOVERY });

        await expectClientError(
            () => stranger.client.userAuthenticator.getMany(owner.id),
            { status: 403 },
        );

        await expectClientError(
            () => stranger.client.userAuthenticator.delete(owner.id, enrolled.data.id),
            { status: 403 },
        );

        // a foreign device id under the OWN nested route is a 404, never
        // an existence oracle
        await expectClientError(
            () => stranger.client.userAuthenticator.getOne('@me', enrolled.data.id),
            { status: 404 },
        );
    });

    it('keeps a non-user identity out of the challenge surface', async () => {
        const status = await suite.client.userAuthenticator.challenge();
        // suite.client authenticates via admin user basic auth — a user
        // without devices is simply not required to present a factor.
        expect(status.required).toBeFalsy();
        expect(status.kinds).toEqual([]);
    });
});
