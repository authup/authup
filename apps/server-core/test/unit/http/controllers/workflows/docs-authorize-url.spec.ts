/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createFakeClient as createFakeHTTPClient } from '@authup/core-http-kit/testing';
import {
    afterAll, 
    beforeAll, 
    describe, 
    expect, 
    it,
} from 'vitest';
import { HTTPInjectionKey } from '../../../../../src/app';
import { createTestApplication } from '../../../../app';
import type { TestHTTPApplication } from '../../../../app';
import { httpRequest } from '../../../../utils';

/**
 * The theming guide tells an operator to open one specific /authorize URL to
 * see their colours applied. Every parameter in it is load-bearing (a
 * name-form client_id needs a realm hint, and a public client needs state and
 * PKCE), so a copy-pasted URL that the verifier rejects renders an error card
 * and the guide's "the submit button should be red" can never be observed.
 *
 * Pinned here because the failure is silent: the page still returns 200.
 */
describe('http/controllers/workflows/docs-authorize-url', () => {
    const suite : TestHTTPApplication = createTestApplication();

    beforeAll(async () => {
        suite.container.register(
            HTTPInjectionKey.InternalHttpClient,
            { useFactory: () => createFakeHTTPClient({ handlers: { 'GET /identity-providers': () => ({ data: [], meta: { total: 0 } }) } }) },
            { lifetime: 'transient' },
        );

        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    // The page itself renders in the auth console service since plan 101
    // D2-2, so what the guide's URL has to resolve to is the context the
    // service renders it from. Same subject, one hop earlier.
    it('should resolve the URL the theming guide documents', async () => {
        const response = await httpRequest(
            suite,
            'GET',
            '/authorize/info?response_type=code&client_id=admin-console&realm_id=master&scope=openid&state=devstate&code_challenge=devchallenge&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2F',
        );

        expect(response.status).toEqual(200);

        const body = await response.json();

        expect(body.error).toBeUndefined();
        expect(body.client).toBeDefined();
    });

    it('should reject the shape the guide used to document', async () => {
        // A refused request still answers 200, carrying the refusal, which
        // is why the assertion has to look inside the answer.
        const response = await httpRequest(
            suite,
            'GET',
            '/authorize/info?response_type=code&client_id=admin-console',
        );

        expect(response.status).toEqual(200);

        const body = await response.json();

        expect(body.error).toBeDefined();
    });
});
