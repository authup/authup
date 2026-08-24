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
import { ConfigInjectionKey } from '../../../../src/app';
import { createTestApplication } from '../../../app';
import { httpRequest } from '../../../utils';

const FOREIGN_ORIGIN = 'https://app.example.com';

/**
 * `Allow-Origin` keeps reflecting every origin: OAuth2 clients are registered
 * at runtime on domains a startup-time allowlist cannot know. `Allow-Credentials`
 * does not: cookie-authenticated surfaces exist now (plan 088), and `SameSite`
 * is scoped to the registrable domain rather than the origin, so a sibling
 * subdomain would otherwise both send the cookie and read the reply.
 */
describe('cors middleware', () => {
    const suite = createTestApplication();

    let publicOrigin : string;

    beforeAll(async () => {
        await suite.setup();

        publicOrigin = new URL(suite.container.resolve(ConfigInjectionKey).publicUrl).origin;
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('answers a foreign origin without credentials', async () => {
        const response = await httpRequest(suite, 'GET', '/', { headers: { origin: FOREIGN_ORIGIN } });

        expect(response.headers.get('access-control-allow-origin')).toEqual(FOREIGN_ORIGIN);
        expect(response.headers.get('access-control-allow-credentials')).toBeNull();
    });

    it('answers publicUrl\'s own origin with credentials', async () => {
        const response = await httpRequest(suite, 'GET', '/', { headers: { origin: publicOrigin } });

        expect(response.headers.get('access-control-allow-origin')).toEqual(publicOrigin);
        expect(response.headers.get('access-control-allow-credentials')).toEqual('true');
    });

    it('applies the same rule to a preflight', async () => {
        const foreign = await httpRequest(suite, 'OPTIONS', '/users', {
            headers: {
                origin: FOREIGN_ORIGIN,
                'access-control-request-method': 'GET',
            },
        });

        expect(foreign.headers.get('access-control-allow-origin')).toEqual(FOREIGN_ORIGIN);
        expect(foreign.headers.get('access-control-allow-credentials')).toBeNull();

        const own = await httpRequest(suite, 'OPTIONS', '/users', {
            headers: {
                origin: publicOrigin,
                'access-control-request-method': 'GET',
            },
        });

        expect(own.headers.get('access-control-allow-credentials')).toEqual('true');
    });
});
