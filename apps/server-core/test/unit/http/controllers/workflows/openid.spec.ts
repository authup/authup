/*
 * Copyright (c) 2022-2024.
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
import type { Config } from '../../../../../src';
import { createTestApplication } from '../../../../app';
import { ConfigInjectionKey } from '../../../../../src';

describe('src/http/controllers/auth/openid/*.ts', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should redirect global discovery to the master realm (OIDC §4.3 / RFC 8414 §3.3 issuer match)', async () => {
        const config = suite.container.resolve<Config>(ConfigInjectionKey);

        const response = await fetch(
            new URL('.well-known/openid-configuration', suite.baseURL),
            { redirect: 'manual' },
        );

        expect(response.status).toEqual(302);
        expect(response.headers.get('location')).toEqual(
            new URL('realms/master/.well-known/openid-configuration', config.publicUrl).href,
        );
    });
});
