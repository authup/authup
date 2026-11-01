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
import { ErrorCode } from '@authup/errors';
import { MailInjectionKey } from '../../../../../src/app';
import { FakeMailClient } from '../../../core/helpers/index.ts';
import { createFakeUser, expectClientError } from '../../../../utils';
import { createTestApplication } from '../../../../app';

describe('http/controller/password-reset', () => {
    const suite = createTestApplication();
    const mailClient = new FakeMailClient();

    beforeAll(async () => {
        suite.container.register(MailInjectionKey, { useValue: mailClient });
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should reset the password with the mailed code', async () => {
        const { data: user } = await suite.client.user.create(createFakeUser());

        await suite.client.user.passwordForgot({ name: user.name });

        expect(mailClient.sent).toHaveLength(1);

        const token = /([0-9a-f]{64})/.exec(mailClient.sent[0].text ?? '')![1];

        await suite.client.user.passwordReset({
            name: user.name,
            token,
            password: 'reset-password-123',
        });

        const grant = await suite.client.token.createWithPassword({
            username: user.name,
            password: 'reset-password-123',
        });

        expect(grant.access_token).toBeDefined();
    });
    it('should refuse a mailed code once the password changed', async () => {
        const { data: user } = await suite.client.user.create(createFakeUser());

        await suite.client.user.passwordForgot({ name: user.name });

        const token = /([0-9a-f]{64})/.exec(mailClient.sent.at(-1)!.text ?? '')![1];

        await suite.client.user.update(user.id, { password: 'changed-password-123' });

        await expectClientError(
            () => suite.client.user.passwordReset({
                name: user.name,
                token,
                password: 'reset-password-123',
            }),
            { status: 404, code: ErrorCode.ENTITY_NOT_FOUND },
        );
    });
});
