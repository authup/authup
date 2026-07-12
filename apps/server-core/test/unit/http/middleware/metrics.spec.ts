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
import { createTestApplication } from '../../../app';
import { createFakeUser, httpRequest } from '../../../utils';

/**
 * Reads the sample value of a counter from a prometheus exposition body.
 * Counters live on prom-client's process-global default registry, so the
 * assertions below check presence / >= 1 rather than exact totals.
 */
function readCounterSample(body: string, name: string, label: string): number {
    const line = body
        .split('\n')
        .find((candidate) => candidate.startsWith(`${name}{`) && candidate.includes(label));

    if (!line) {
        return 0;
    }

    return Number(line.split(' ').pop());
}

describe('http/middleware/metrics (auth-flow counters)', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.middlewarePrometheus = true;
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

    it('exposes login and token-grant counters for the password grant', async () => {
        const success = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'password',
                username: user.name,
                password: user.password!,
            },
        });
        expect(success.status).toEqual(200);

        const failure = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'password',
                username: user.name,
                password: 'definitely-wrong-password',
            },
        });
        expect(failure.status).toEqual(400);

        const response = await httpRequest(suite, 'GET', '/metrics');
        expect(response.status).toEqual(200);

        const body = await response.text();
        expect(readCounterSample(body, 'authup_login_total', 'result="success"')).toBeGreaterThanOrEqual(1);
        expect(readCounterSample(body, 'authup_login_total', 'result="failure"')).toBeGreaterThanOrEqual(1);
        expect(readCounterSample(body, 'authup_token_grant_total', 'grant_type="password"')).toBeGreaterThanOrEqual(1);
    });
});
