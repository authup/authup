/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import type { Client, IdentityProvider, Realm } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import {
    ApplicationBuilder,
    ConfigInjectionKey,
    ConfigModule, 
    DatabaseModule, 
} from '../../../../../../src';
import type { Config } from '../../../../../../src';
import { normalizeConfig } from '../../../../../../src/app/modules/config/normalize.ts';
import { readConfigRawFromEnv } from '../../../../../../src/app/modules/config/read/index.ts';
import { PACKAGE_PATH } from '../../../../../../src/path.ts';
import { TestHTTPApplication } from '../../../../../app/http.ts';
import {
    createFakeClient,
    createFakeOAuth2IdentityProvider,
    createFakeRealm,
    httpRequest,
} from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

/**
 * Two REAL authup instances, each with its own database: a downstream one that
 * brokers a login to an upstream one. Every fake-IdP spec stubs the provider's
 * token endpoint, so none of them proves that authup can consume authup. This
 * one does the whole round trip against the real endpoints.
 */

const DATABASE_DIRECTORY_PATH = path.join(PACKAGE_PATH, 'writable');
const TEMPLATE_DATABASE_PATH = path.join(DATABASE_DIRECTORY_PATH, 'test.sql');

const UPSTREAM_CLIENT_NAME = 'downstream-broker';
const UPSTREAM_CLIENT_SECRET = 'downstream-broker-secret';

const RP_REDIRECT_URI = 'https://rp.example.com/login/callback';
const RP_STATE = 'rp-state-value';
const CODE_VERIFIER = 'aVeryLongCodeVerifierValueUsedByThePublicClient1234567890';

/**
 * A second application on its own sqlite file. The suite module pins one
 * database per vitest worker, so two instances sharing it would be one logical
 * IdP with two ports, which is exactly what this test must not be.
 */
const upstreamDatabasePath = path.join(
    DATABASE_DIRECTORY_PATH,
    `test-upstream-${process.env.VITEST_POOL_ID || '0'}.sql`,
);

function createUpstreamApplication(): TestHTTPApplication {
    const database = upstreamDatabasePath;

    const modules = new ApplicationBuilder()
        .withConfig(new ConfigModule(async () => {
            const config = await normalizeConfig(readConfigRawFromEnv()) as Config;
            config.port = 0;
            config.middlewareRateLimit = false;
            config.middlewarePrometheus = false;
            config.middlewareSwagger = false;
            config.userAdminEnabled = true;
            config.userAuthBasic = true;
            config.redis = false;
            return config;
        }))
        .withLogger()
        .withCache()
        .withLdap()
        .withMail()
        .withDatabase(new DatabaseModule({
            prepareBuild: async (container) => {
                const config = container.resolve(ConfigInjectionKey);
                config.db = {
                    type: 'better-sqlite3',
                    database,
                };
                container.register(ConfigInjectionKey, { useValue: config });
            },
            setup: async () => {
                fs.rmSync(database, { force: true });
                fs.copyFileSync(TEMPLATE_DATABASE_PATH, database);
            },
            migrate: async (_container, dataSource) => {
                await dataSource.synchronize();
            },
        }))
        .withAuthentication()
        .withIdentity()
        .withOAuth2()
        .withHTTP()
        .buildModules();

    return new TestHTTPApplication({ modules });
}

describe('authup federating to authup', () => {
    const downstream = createTestApplication();
    const upstream = createUpstreamApplication();

    let realm: Realm;
    let provider: IdentityProvider;
    let rpClient: Client;
    let codeChallenge: string;
    // The downstream builds its callback URL from publicUrl, not from the
    // random test port, so the upstream must allow that origin and the
    // callback has to be delivered back to the port the instance listens on.
    let downstreamPublicURL: string;

    beforeAll(async () => {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(CODE_VERIFIER));
        codeChallenge = Buffer.from(new Uint8Array(digest)).toString('base64url');

        await downstream.setup();
        await upstream.setup();

        downstreamPublicURL = downstream.container
            .resolve(ConfigInjectionKey)
            .publicUrl
            .replace(/\/$/, '');

        // Downstream: the realm the federated users land in, plus the public
        // PKCE client the relying party authenticates with.
        realm = (await downstream.client.realm.create(createFakeRealm())).data;

        rpClient = (await downstream.client.client.create(createFakeClient({
            realmId: realm.id,
            authMethod: 'none',
            redirectUri: 'https://rp.example.com/**',
        }))).data;

        for (const scopeName of [ScopeName.GLOBAL, ScopeName.OPEN_ID]) {
            const { data: scope } = await downstream.client.scope.getOne(scopeName);
            await downstream.client.clientScope.create({ scopeId: scope.id, clientId: rpClient.id });
        }

        // Upstream first: a real setup registers the client on the provider
        // and pastes its id/secret into the downstream provider config.
        const upstreamClient = (await upstream.client.client.create(createFakeClient({
            name: UPSTREAM_CLIENT_NAME,
            secret: UPSTREAM_CLIENT_SECRET,
            secretHashed: false,
            secretEncrypted: false,
            authMethod: 'secret',
            redirectUri: `${downstreamPublicURL}/identity-providers/**`,
        }))).data;

        provider = (await downstream.client.identityProvider.create(createFakeOAuth2IdentityProvider({
            realmId: realm.id,
            clientId: upstreamClient.id,
            clientSecret: UPSTREAM_CLIENT_SECRET,
            authorizeUrl: `${upstream.baseURL}/authorize`,
            tokenUrl: `${upstream.baseURL}/token`,
            scope: ScopeName.GLOBAL,
        }))).data;

        for (const scopeName of [ScopeName.GLOBAL, ScopeName.OPEN_ID]) {
            const { data: scope } = await upstream.client.scope.getOne(scopeName);
            await upstream.client.clientScope.create({ scopeId: scope.id, clientId: upstreamClient.id });
        }
    });

    afterAll(async () => {
        await downstream.teardown();
        await upstream.teardown();

        // The global setup only sweeps the per-worker `test-<n>.sql` files, so
        // this one cleans up after itself.
        fs.rmSync(upstreamDatabasePath, { force: true });
    });

    it('completes a login brokered from one instance to the other', async () => {
        const codeRequest = Buffer.from(JSON.stringify({
            response_type: 'code',
            client_id: rpClient.id,
            realm_id: realm.id,
            redirect_uri: RP_REDIRECT_URI,
            scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`,
            state: RP_STATE,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
        })).toString('base64url');

        // 1. The relying party's request reaches the downstream instance, which
        //    sends the browser to the upstream instance.
        const out = await httpRequest(downstream, 'GET', `identity-providers/${provider.id}/authorize-out?codeRequest=${codeRequest}`, { redirect: 'manual' });
        expect(out.status).toEqual(302);

        const upstreamURL = new URL(out.headers.get('location') as string);
        expect(upstreamURL.origin).toEqual(new URL(upstream.baseURL).origin);

        const brokerState = upstreamURL.searchParams.get('state') as string;
        expect(brokerState).toBeTruthy();

        // 2. The person authenticates on the upstream instance and approves.
        //    Its hosted page posts exactly this once the session exists.
        const upstreamToken = await upstream.client.token.createWithPassword({
            username: 'admin',
            password: 'start123',
        });

        const approve = await httpRequest(upstream, 'POST', 'authorize', {
            headers: {
                authorization: `Bearer ${upstreamToken.access_token}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                response_type: 'code',
                client_id: upstreamURL.searchParams.get('client_id'),
                redirect_uri: upstreamURL.searchParams.get('redirect_uri'),
                scope: upstreamURL.searchParams.get('scope'),
                state: brokerState,
            }),
        });
        expect(approve.status).toEqual(200);

        const { url: callbackURL } = await approve.json();
        expect(new URL(callbackURL).origin).toEqual(new URL(downstreamPublicURL).origin);

        // The browser resolves publicUrl to the running instance; here that is
        // the random test port.
        const callback = new URL(callbackURL);
        const callbackTarget = `${downstream.baseURL}${callback.pathname}${callback.search}`;

        // 3. The upstream code comes back to the downstream callback, which
        //    redeems it at the upstream token endpoint for real.
        // httpRequest passes an absolute url straight through.
        const back = await httpRequest(downstream, 'GET', callbackTarget, { redirect: 'manual' });
        expect(back.status).toEqual(302);

        // 4. The downstream instance returns its own code to the relying party.
        const rpURL = new URL(back.headers.get('location') as string);
        expect(`${rpURL.origin}${rpURL.pathname}`).toEqual(RP_REDIRECT_URI);
        expect(rpURL.searchParams.get('state')).toEqual(RP_STATE);

        // 5. The relying party redeems it with the PKCE verifier it generated.
        const token = await httpRequest(downstream, 'POST', 'token', {
            form: {
                grant_type: 'authorization_code',
                code: rpURL.searchParams.get('code') as string,
                client_id: rpClient.id,
                redirect_uri: RP_REDIRECT_URI,
                code_verifier: CODE_VERIFIER,
            },
        });

        expect(token.status).toEqual(200);
        await expect(token.json()).resolves.toMatchObject({
            access_token: expect.any(String),
            refresh_token: expect.any(String),
        });
    });
});
