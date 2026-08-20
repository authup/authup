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
import type { Client, IdentityProvider, Realm } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import {
    ApplicationBuilder,
    ConfigInjectionKey,
    ConfigModule,
    DefaultProvisioningSource,
    ProvisionerModule,
} from '../../../../../../src';
import type { Config } from '../../../../../../src';
import { normalizeConfig } from '../../../../../../src/app/modules/config/normalize.ts';
import { readConfigRawFromEnv } from '../../../../../../src/app/modules/config/read/index.ts';
import { TestHTTPApplication } from '../../../../../app/http.ts';
import {
    createFakeClient,
    createFakeOAuth2IdentityProvider,
    createFakeRealm,
    httpRequest,
} from '../../../../../utils';
import { createTestApplication, createTestDatabaseModuleForSecondaryInstance } from '../../../../../app';

/**
 * Two REAL authup instances, each with its own database: a downstream one that
 * brokers a login to an upstream one. Every fake-IdP spec stubs the provider's
 * token endpoint, so none of them proves that authup can consume authup. This
 * one does the whole round trip against the real endpoints.
 */

const UPSTREAM_CLIENT_NAME = 'downstream-broker';
const UPSTREAM_CLIENT_SECRET = 'downstream-broker-secret';

const RP_REDIRECT_URI = 'https://rp.example.com/login/callback';
const RP_STATE = 'rp-state-value';
const CODE_VERIFIER = 'aVeryLongCodeVerifierValueUsedByThePublicClient1234567890';

/**
 * A second application on its own database, on whatever dialect the run uses.
 * The suite module pins one database per vitest worker, so two instances
 * sharing it would be one logical IdP with two ports, which is exactly what
 * this test must not be. That database starts empty, so this instance
 * provisions itself rather than inheriting the suite's template.
 */
function createUpstreamApplication(): TestHTTPApplication {
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
        .withDatabase(createTestDatabaseModuleForSecondaryInstance('upstream'))
        .withProvisioning(new ProvisionerModule([
            new DefaultProvisioningSource(),
        ]))
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

    // This is the only spec that boots TWO applications, and each `setup()` is
    // a schema synchronize plus a full provisioning pass before it listens -
    // then the body below adds ten API round-trips on top. Vitest's default
    // hook budget is 10s, which the sqlite runs clear easily and the mysql one
    // does not: it shares one server with every other spec file and runs with
    // file parallelism off, so the two boots serialize behind whatever else is
    // in flight. The work is real, so the budget is raised rather than the
    // hook trimmed.
    const TWO_INSTANCE_HOOK_TIMEOUT = 60_000;

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
    }, TWO_INSTANCE_HOOK_TIMEOUT);

    afterAll(async () => {
        await downstream.teardown();
        await upstream.teardown();
    }, TWO_INSTANCE_HOOK_TIMEOUT);

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
        const startCookie = (out.headers.get('set-cookie') ?? '').match(/authup_federated_login=([^;]*)/);
        expect(startCookie?.[1]).toBeTruthy();

        const back = await httpRequest(downstream, 'GET', callbackTarget, {
            redirect: 'manual',
            headers: { cookie: `authup_federated_login=${(startCookie as RegExpMatchArray)[1]}` },
        });
        expect(back.status).toEqual(302);

        // 4. The downstream instance sends the browser to its own hosted
        //    authorize page with a login handle, which the page redeems for
        //    the session the callback established (plan 094).
        const hostedURL = new URL(back.headers.get('location') as string);
        expect(hostedURL.pathname.endsWith('/authorize')).toBe(true);
        expect(hostedURL.searchParams.get('code')).toBeNull();

        const pendingLoginCookie = (back.headers.get('set-cookie') ?? '')
            .match(/authup_federated_login=([^;]*)/);
        expect(pendingLoginCookie?.[1]).toBeTruthy();

        const redeem = await httpRequest(
            downstream,
            'POST',
            `identity-providers/${hostedURL.searchParams.get('provider')}/login-complete`,
            { headers: { cookie: `authup_federated_login=${(pendingLoginCookie as RegExpMatchArray)[1]}` } },
        );
        expect(redeem.status).toEqual(200);
        const grant = await redeem.json();

        // 5. The consent post issues the relying party's code, the same call
        //    an interactive login makes.
        const rpApprove = await httpRequest(downstream, 'POST', 'authorize', {
            headers: {
                authorization: `Bearer ${grant.access_token}`,
                'content-type': 'application/json',
            },
            body: Buffer.from(codeRequest, 'base64url').toString('utf-8'),
        });
        expect(rpApprove.status).toEqual(200);

        const rpURL = new URL((await rpApprove.json()).url);
        expect(`${rpURL.origin}${rpURL.pathname}`).toEqual(RP_REDIRECT_URI);
        expect(rpURL.searchParams.get('state')).toEqual(RP_STATE);

        // 6. The relying party redeems it with the PKCE verifier it generated.
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
