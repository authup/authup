/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@authup/errors';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createTestApplication } from '../../../../../app';
import { createFakeUser, httpRequest } from '../../../../../utils';

const THRESHOLD = 3;
const WINDOW_SECONDS = 900;

describe('src/http/controllers/token (login throttle)', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.loginAttemptThrottleEnabled = true;
            config.loginAttemptThreshold = THRESHOLD;
            config.loginAttemptWindow = WINDOW_SECONDS;
        },
    });

    const user = createFakeUser();

    beforeAll(async () => {
        await suite.setup();

        await suite.client.user.create(user);
    });

    afterAll(async () => {
        await suite.teardown();
    });

    function passwordAttempt(username: string, password: string): Promise<Response> {
        return httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'password',
                username,
                password,
            },
        });
    }

    it('throttles the (identifier, ip) pair after the threshold of failed attempts', async () => {
        for (let i = 0; i < THRESHOLD; i++) {
            const response = await passwordAttempt(user.name, 'definitely-wrong-password');
            expect(response.status).toEqual(400);
        }

        const throttled = await passwordAttempt(user.name, 'definitely-wrong-password');
        expect(throttled.status).toEqual(429);

        const body = await throttled.json();
        expect(body.code).toEqual(ErrorCode.LOGIN_ATTEMPT_THROTTLED);
        // AuthupError.toJSON() flattens `data` into the top-level payload
        expect(body.retryAfter).toEqual(WINDOW_SECONDS);
    });

    it('locks out even the correct password within the window', async () => {
        const response = await passwordAttempt(user.name, user.password!);
        expect(response.status).toEqual(429);

        const body = await response.json();
        expect(body.code).toEqual(ErrorCode.LOGIN_ATTEMPT_THROTTLED);
    });

    it('does not throttle a different identifier from the same IP', async () => {
        const other = createFakeUser();
        await suite.client.user.create(other);

        const response = await passwordAttempt(other.name, other.password!);
        expect(response.status).toEqual(200);

        const body = await response.json();
        expect(body.access_token).toBeDefined();
    });
});
