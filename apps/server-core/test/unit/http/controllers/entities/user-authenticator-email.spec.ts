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
import { MailInjectionKey } from '../../../../../src/app';
import { FakeMailClient } from '../../../core/helpers/index.ts';
import { createFakeUser } from '../../../../utils';
import { createTestApplication } from '../../../../app';

const MFA_KEY = Buffer.alloc(32, 4).toString('base64');

describe('src/http/controllers/user-authenticator (email otp)', () => {
    const mailClient = new FakeMailClient();

    const suite = createTestApplication({
        config: (config) => {
            config.mfaEnabled = true;
            config.mfaEncryptionKey = MFA_KEY;
        },
    });

    beforeAll(async () => {
        suite.container.register(MailInjectionKey, { useValue: mailClient });
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('enrolls an email factor, mails a code, and verifies it', async () => {
        const password = 'email-otp-user';
        const user = await suite.client.user.create(createFakeUser({ password }));

        const login = await suite.client.token.createWithPassword({
            username: user.name,
            password,
        });
        const bearer = new HTTPClient({ baseURL: suite.baseURL });
        bearer.setAuthorizationHeader({ type: 'Bearer', token: login.access_token });

        const enrolled = await bearer.userAuthenticator.enroll('@me', { kind: UserAuthenticatorKind.EMAIL });
        expect(enrolled.entity.kind).toEqual(UserAuthenticatorKind.EMAIL);
        expect(enrolled.entity.confirmed).toBeTruthy();

        const challenge = await bearer.userAuthenticator.challenge();
        expect(challenge.required).toBeTruthy();
        expect(challenge.kinds).toContain(UserAuthenticatorKind.EMAIL);

        mailClient.clear();
        const send = await bearer.userAuthenticator.sendChallenge({ kind: UserAuthenticatorKind.EMAIL });
        expect(send.success).toBeTruthy();
        expect(mailClient.sent).toHaveLength(1);
        expect(mailClient.sent[0].to).toEqual(user.email);

        const code = /(\d{6})/.exec(mailClient.sent[0].text ?? '')![1];

        const verified = await bearer.userAuthenticator.verifyChallenge({
            kind: UserAuthenticatorKind.EMAIL,
            response: code,
        });
        expect(verified.verified).toBeTruthy();
    });
});
