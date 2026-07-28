/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EventName } from '@authup/core-kit';
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

/**
 * Issue #3230: the request-IP derivation follows the `trustProxy` config.
 * Pinned to a proxy contract (hops / allowlist / false), a direct client
 * rotating X-Forwarded-For values must NOT evade the (identifier, ip)
 * login throttle nor forge audit attribution; behind a trusted hop, the
 * forwarded address is the one recorded.
 */
describe('src/http/controllers/token (trustProxy off)', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.loginAttemptThrottleEnabled = true;
            config.loginAttemptThreshold = THRESHOLD;
            config.loginAttemptWindow = 900;
            config.trustProxy = false;
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

    it('throttles despite a rotating X-Forwarded-For header', async () => {
        for (let i = 0; i < THRESHOLD; i++) {
            const response = await httpRequest(suite, 'POST', '/token', {
                headers: { 'X-Forwarded-For': `198.51.100.${i + 1}` },
                form: {
                    grant_type: 'password',
                    username: user.name,
                    password: 'definitely-wrong-password',
                },
            });
            expect(response.status).toEqual(400);
        }

        const throttled = await httpRequest(suite, 'POST', '/token', {
            headers: { 'X-Forwarded-For': '198.51.100.99' },
            form: {
                grant_type: 'password',
                username: user.name,
                password: 'definitely-wrong-password',
            },
        });
        expect(throttled.status).toEqual(429);

        const body = await throttled.json();
        expect(body.code).toEqual(ErrorCode.LOGIN_ATTEMPT_THROTTLED);
    });

    it('records the socket address, not the forwarded value, on the audit row', async () => {
        const { data } = await suite.client.event.getMany({ filters: { name: EventName.LOGIN_FAILED, actorName: user.name } });

        expect(data.length).toBeGreaterThanOrEqual(1);
        for (const row of data) {
            expect(row.requestIpAddress).not.toMatch(/^198\.51\.100\./);
        }
    });
});

describe('src/http/controllers/token (trustProxy hop count)', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.trustProxy = 1;
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

    it('records the forwarded address behind one trusted hop', async () => {
        const response = await httpRequest(suite, 'POST', '/token', {
            headers: { 'X-Forwarded-For': '203.0.113.9' },
            form: {
                grant_type: 'password',
                username: user.name,
                password: 'definitely-wrong-password',
            },
        });
        expect(response.status).toEqual(400);

        const { data } = await suite.client.event.getMany({ filters: { name: EventName.LOGIN_FAILED, actorName: user.name } });

        expect(data.length).toBeGreaterThanOrEqual(1);
        expect(data[0].requestIpAddress).toEqual('203.0.113.9');
    });
});
