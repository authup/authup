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
import { ClientEntity } from '../../../src/adapters/database/domains';
import { HTTPInjectionKey } from '../../../src/app';
import { resolveCLIConsoleSelection } from '../../../src/cli/commands/console';
import { createTestApplication } from '../../app';
import { createFakeClient, expectClientError, httpRequest } from '../../utils';

// both the static shells' inline config and the SSR page's hydration payload
// sit under the one reserved window global, on one line each.
function extractWindowPayload(body: string) : Record<string, any> {
    const match = body.match(/window\.__AUTHUP__ = (.+);/);
    expect(match).toBeTruthy();
    return JSON.parse(match![1]);
}

/**
 * The console role (plan 099): the identity provider without its management
 * API. Any request may land on one of its replicas and is answered like on
 * `start`, except an entity route, which 404s: an admin-UI pod that cannot
 * answer `/users` even when misrouted is the role's identity.
 *
 * The harness boots the role's HTTP shape (`managementApi: false`); the
 * module composition itself is pinned in `app/factory.spec.ts`.
 */
describe('http (console role)', () => {
    const suite = createTestApplication({ managementApi: false });

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should serve the console shells', async () => {
        const admin = await httpRequest(suite, 'GET', '/console/admin');
        expect(admin.status).toEqual(200);
        expect(admin.headers.get('content-type')).toContain('text/html');

        const adminConfig = extractWindowPayload(await admin.text());
        expect(adminConfig.basePath).toEqual('/console/admin');
        expect(adminConfig.features.adminConsole).toEqual(true);
        expect(adminConfig.cookieSession).toEqual(true);

        const account = await httpRequest(suite, 'GET', '/console/account');
        expect(account.status).toEqual(200);
        expect(extractWindowPayload(await account.text()).basePath).toEqual('/console/account');
    });

    it('should render the hosted authorize page for the console sign-in kick', async () => {
        // the kick mints the very authorize request the hosted page has to
        // answer, so it is the request rendered here.
        const kick = await httpRequest(suite, 'GET', '/console/admin/login?realmId=master', { redirect: 'manual' });
        expect(kick.status).toEqual(302);

        const authorizeURL = new URL(kick.headers.get('location') as string);
        const response = await httpRequest(suite, 'GET', `${authorizeURL.pathname}${authorizeURL.search}`);
        expect(response.status).toEqual(200);
        expect(response.headers.get('content-type')).toContain('text/html');

        const payload = extractWindowPayload(await response.text());
        expect(payload.data.error).toBeUndefined();
        expect(payload.data.client.name).toEqual('admin-console');

        // a refused request still renders, with the refusal embedded
        const refused = await httpRequest(suite, 'GET', '/authorize?response_type=code&client_id=unknown');
        expect(refused.status).toEqual(200);
        expect(extractWindowPayload(await refused.text()).data.error).toBeDefined();
    });

    it('should answer the self-calls the hosted pages make on this replica', async () => {
        // the SSR render's own client dispatches against this listener; the
        // routes it reaches for (the provider list, the realm list) are on
        // controllers the role keeps.
        const uiHttpClient = suite.container.resolve(HTTPInjectionKey.UIHttpClient);

        const providers = await uiHttpClient.identityProvider.getMany();
        expect(Array.isArray(providers.data)).toBeTruthy();

        const realms = await uiHttpClient.realm.getMany();
        expect(realms.data.map((realm) => realm.name)).toContain('master');
    });

    it('should issue tokens and answer the session endpoint', async () => {
        // The management API is off, so the confidential client is written
        // straight into the table.
        const { data: realm } = await suite.client.realm.getOne('master');
        const repository = suite.dataSource.getRepository(ClientEntity);
        const client = await repository.save(repository.create({
            ...createFakeClient(),
            realmId: realm.id,
            secret: 'console-role-secret',
            secretHashed: false,
            secretEncrypted: false,
            active: true,
            builtIn: false,
        }));

        const grant = await suite.client.token.createWithClientCredentials({
            client_id: client.id,
            client_secret: 'console-role-secret',
        });
        expect(typeof grant.access_token).toEqual('string');

        const login = await suite.client.token.createWithPassword({
            username: 'admin',
            password: 'start123',
        });

        const session = await httpRequest(suite, 'GET', '/sessions/@me/introspect', { headers: { authorization: `Bearer ${login.access_token}` } });
        expect(session.status).toEqual(200);
        expect((await session.json()).active).toEqual(true);
    });

    it('should answer the status document', async () => {
        const status = await suite.client.status.get();

        expect(typeof status.version).toEqual('string');
        expect(status.features.adminConsole).toEqual(true);
        expect(status.features.accountConsole).toEqual(true);
    });

    it('should answer 404 on the management api, credentials or not', async () => {
        // the suite client carries admin Basic auth: the routes are absent,
        // not forbidden.
        await expectClientError(() => suite.client.user.getMany(), { status: 404 });
        await expectClientError(() => suite.client.user.getOne('@me'), { status: 404 });
        await expectClientError(() => suite.client.role.getMany(), { status: 404 });
        await expectClientError(() => suite.client.key.getMany(), { status: 404 });
        await expectClientError(() => suite.client.event.getMany(), { status: 404 });

        const anonymous = await httpRequest(suite, 'GET', '/roles');
        expect(anonymous.status).toEqual(404);

        // the control: a kept controller under the same prefix still answers
        const authenticators = await suite.client.userAuthenticator.getMany('@me');
        expect(Array.isArray(authenticators.data)).toBeTruthy();
    });
});

/**
 * The positionals of `authup-server console [admin|account]` are sugar over
 * the two console flags, so `console admin` leaves the account console
 * disabled on the server too: its sign-in kick answers the shell instead of
 * minting a pending login.
 */
describe('http (console role, `console admin`)', () => {
    const suite = createTestApplication({
        managementApi: false,
        config: (config) => {
            Object.assign(config, resolveCLIConsoleSelection(['admin']));
        },
    });

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should kick the admin console and refuse the account console sign-in', async () => {
        const admin = await httpRequest(suite, 'GET', '/console/admin/login?realmId=master', { redirect: 'manual' });
        expect(admin.status).toEqual(302);
        expect(admin.headers.get('location')).toContain('/authorize?');

        const account = await httpRequest(suite, 'GET', '/console/account/login?realmId=master', { redirect: 'manual' });
        expect(account.status).toEqual(200);
        expect(account.headers.get('content-type')).toContain('text/html');
        expect(account.headers.get('set-cookie')).toBeNull();
        expect(extractWindowPayload(await account.text()).features.accountConsole).toEqual(false);
    });

    it('should report the selection on the status document', async () => {
        const status = await suite.client.status.get();

        expect(status.features.adminConsole).toEqual(true);
        expect(status.features.accountConsole).toEqual(false);
    });
});
