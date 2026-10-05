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
import { MailInjectionKey } from '../../../../../src/app';
import { UserEntity } from '../../../../../src/adapters/database/domains/user/entity.ts';
import { FakeMailClient } from '../../../core/helpers/index.ts';
import { createFakeUser, expectClientError } from '../../../../utils';
import { createTestApplication } from '../../../../app';

describe('http/controller/activate', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.emailVerificationEnabled = true;
        },
    });
    const mailClient = new FakeMailClient();

    beforeAll(async () => {
        suite.container.register(MailInjectionKey, { useValue: mailClient });
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('accepts a mailed activation code once', async () => {
        const user = createFakeUser();
        const response = await suite.client.user.register(user);
        expect(response.active).toBeFalsy();

        expect(mailClient.sent).toHaveLength(1);
        const token = /([0-9a-f]{64})/.exec(mailClient.sent[0].text ?? '')![1];

        await suite.client.user.activate(token);

        const row = await suite.dataSource.getRepository(UserEntity).createQueryBuilder('user')
            .addSelect('user.activateHash').where('user.name = :name', { name: user.name }).getOne();
        expect(row?.active).toBe(true);
        expect(row?.activateHash).toBeNull();

        await expectClientError(() => suite.client.user.activate(token), { status: 404 });
    });
});
