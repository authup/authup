/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName } from '@authup/core-kit';
import { Client as HTTPClient } from '@authup/core-http-kit';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createTestApplication } from '../../../../app';
import { createFakeClient, createFakeRealm, createFakeUser } from '../../../../utils';

/**
 * Regression: a `SESSION_READ` holder scoped to its own realm must not be able
 * to read another realm's sessions by projecting `realm_id` out of the response
 * (which would otherwise neutralize the per-row realm_scope gate).
 */
describe('session (realm isolation)', () => {
    const suite = createTestApplication();

    let actor: HTTPClient;
    let foreignSessionId: string;
    let ownSessionId: string;
    const knownSecret = 'session-realm-isolation-secret';

    beforeAll(async () => {
        await suite.setup();

        const realmB = await suite.client.realm.create(createFakeRealm());

        // a session in the foreign realm (B)
        const passwordB = 'session-iso-foreign-pw';
        const userB = createFakeUser({ realm_id: realmB.id, password: passwordB });
        await suite.client.user.create(userB);
        const loginB = await suite.client.token.createWithPassword({
            username: userB.name,
            password: passwordB,
            realm_id: realmB.id,
        });
        foreignSessionId = (await suite.client.token.introspect({ token: loginB.access_token })).session_id!;

        // a session in the actor's own realm (master)
        const passwordM = 'session-iso-own-pw';
        const userM = createFakeUser({ password: passwordM });
        await suite.client.user.create(userM);
        const loginM = await suite.client.token.createWithPassword({
            username: userM.name,
            password: passwordM,
        });
        ownSessionId = (await suite.client.token.introspect({ token: loginM.access_token })).session_id!;

        // a restricted actor in master holding SESSION_READ at the default `own` scope
        const cA = await suite.client.client.create({
            ...createFakeClient(),
            auth_method: 'secret',
            token_binding_method: 'none',
            secret: knownSecret,
            secret_hashed: false,
            secret_encrypted: false,
        });
        const permission = await suite.client.permission.getOne(PermissionName.SESSION_READ);
        await suite.client.clientPermission.create({ client_id: cA.id, permission_id: permission.id });

        const token = await suite.client.token.createWithClientCredentials({
            client_id: cA.id,
            client_secret: knownSecret,
        });
        actor = new HTTPClient({ baseURL: suite.baseURL });
        actor.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('keeps a foreign-realm session hidden even when realm_id is projected away', async () => {
        // control: the own-realm session IS visible to the own-scoped reader
        const own = await actor.session.getMany({ filter: { id: ownSessionId }, fields: ['id', 'sub'] });
        expect(own.data.some((s) => s.id === ownSessionId)).toBe(true);

        // the foreign-realm session must NOT appear despite fields=id,sub omitting realm_id
        const foreign = await actor.session.getMany({ filter: { id: foreignSessionId }, fields: ['id', 'sub'] });
        expect(foreign.data.some((s) => s.id === foreignSessionId)).toBe(false);
    });
});
