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
import type { Config } from '../../../../../src/index.ts';
import { ConfigInjectionKey } from '../../../../../src/index.ts';
import { createTestApplication } from '../../../../app';

describe('src/http/controllers/workflows/status/*.ts', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should return version, date and feature flags', async () => {
        const response = await suite.client.status.get();

        expect(typeof response.version).toEqual('string');
        expect(typeof response.date).toEqual('string');

        // the test application factory enables all three workflows;
        // the account console is on by default
        expect(response.features).toEqual({
            registration: true,
            passwordRecovery: true,
            emailVerification: true,
            accountConsole: true,
            adminConsole: true,
        });
    });

    it('should advertise the deployment urls', async () => {
        const config = suite.container.resolve<Config>(ConfigInjectionKey);

        const response = await suite.client.status.get();

        expect(response.publicUrl).toEqual(config.publicUrl);

        // the test application factory turns the swagger middleware off
        expect(response.endpoints).toEqual({
            openidConfiguration: new URL('.well-known/openid-configuration', config.publicUrl).href,
            realms: new URL('realms', config.publicUrl).href,
            docs: null,
            openapi: null,
        });

        expect(response.consoles).toEqual({
            admin: config.adminConsole.url,
            account: config.accountConsole.url,
            auth: config.authConsole.url,
        });
    });
});

describe('src/http/controllers/workflows/status/*.ts (swagger enabled)', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.middlewareSwagger = true;
        },
    });

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should advertise the docs urls', async () => {
        const config = suite.container.resolve<Config>(ConfigInjectionKey);

        const response = await suite.client.status.get();

        expect(response.endpoints.docs).toEqual(new URL('docs', config.publicUrl).href);
        expect(response.endpoints.openapi).toEqual(new URL('docs/openapi.json', config.publicUrl).href);
    });
});

describe('src/http/controllers/workflows/status/*.ts (admin console disabled)', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.adminConsole.enabled = false;
        },
    });

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should answer null for a disabled console', async () => {
        const config = suite.container.resolve<Config>(ConfigInjectionKey);

        const response = await suite.client.status.get();

        expect(response.consoles.admin).toBeNull();
        expect(response.consoles.account).toEqual(config.accountConsole.url);
        expect(response.consoles.auth).toEqual(config.authConsole.url);
        expect(response.features.adminConsole).toBe(false);
    });
});
