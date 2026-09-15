/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import type { AuthorizationCheckResult } from '@authup/access';
import { RealmScope } from '@authup/access';
import { PermissionName } from '@authup/core-kit';
import { OAuth2TokenKind } from '@authup/specs';
import { OAuth2InjectionToken } from '../../../../../src/app/modules/oauth2/constants';
import { createTestApplication } from '../../../../app';
import { createFakeRealm, createFakeUser, httpRequest } from '../../../../utils';

function entryOf(result: AuthorizationCheckResult, name: string) {
    return result.find((item) => item.name === name);
}

/**
 * `httpRequest` takes a raw `BodyInit`, so a plain object would go out as
 * `[object Object]` with no content type and the route would read an empty
 * body, which is the DEFAULT request rather than the one under test.
 */
function postCheck(
    suite: ReturnType<typeof createTestApplication>,
    body: Record<string, any>,
    headers: Record<string, string> = {},
) {
    return httpRequest(suite, 'POST', '/authorization/check', {
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', ...headers },
    });
}

describe('src/http/controllers/workflows/authorization/check', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('answers every permission for an admin, in its own realm and globally', async () => {
        const result = await suite.client.authorization.check();

        expect(result.length).toBeGreaterThanOrEqual(Object.values(PermissionName).length);

        const entry = entryOf(result, PermissionName.USER_UPDATE);
        expect(entry).toBeDefined();
        // `admin` holds `any`, so both requested realms pass
        expect(entry!.realms).toHaveLength(2);
        expect(entry!.realms).toContain(null);
    });

    it('answers only the requested subset', async () => {
        const result = await suite.client.authorization.check({ names: [PermissionName.USER_UPDATE, PermissionName.CLIENT_READ] });

        expect(result.map((item) => item.name).sort()).toEqual(
            [PermissionName.CLIENT_READ, PermissionName.USER_UPDATE].sort(),
        );
    });

    it('omits a name with no global definition rather than failing the call', async () => {
        const result = await suite.client.authorization.check({ names: [PermissionName.USER_UPDATE, 'not_a_permission_at_all'] });

        expect(result.map((item) => item.name)).toEqual([PermissionName.USER_UPDATE]);
    });

    it('refuses an anonymous caller and a refresh token, like every identity route', async () => {
        const anonymous = await postCheck(suite, {});
        expect(anonymous.status).toBe(401);

        const grant = await suite.client.token.createWithPassword({ username: 'admin', password: 'start123' });
        const refresh = await postCheck(suite, {}, { Authorization: `Bearer ${grant.refresh_token}` });
        expect(refresh.status).toBe(401);
    });

    it('answers a bearer without the global scope nothing, never a passing set', async () => {
        const grant = await suite.client.token.createWithPassword({ username: 'admin', password: 'start123' });
        const payload = await suite.client.token.introspect(
            { token: grant.access_token },
            { authorizationHeaderInherit: true },
        );

        const signer = suite.container.resolve(OAuth2InjectionToken.TokenSigner);
        const restricted = await signer.sign({
            jti: randomUUID(),
            sub: payload.sub,
            sub_kind: payload.sub_kind,
            realm_id: payload.realm_id,
            client_id: payload.client_id,
            session_id: payload.session_id,
            iat: payload.iat,
            exp: payload.exp,
            scope: 'openid',
            kind: OAuth2TokenKind.ACCESS,
        });

        const response = await postCheck(suite, {}, { Authorization: `Bearer ${restricted}` });

        expect(response.status).toBe(200);
        // named rather than asserted empty: spec files sharing a worker share
        // one database copy, and a permission another spec created through the
        // API carries no Layer-1 policy, so it passes for any authenticated
        // caller and would make an empty-array assertion flake
        const result : AuthorizationCheckResult = await response.json();
        expect(entryOf(result, PermissionName.USER_UPDATE)).toBeUndefined();
        expect(entryOf(result, PermissionName.PERMISSION_READ)).toBeUndefined();
    });

    it('needs no permission of its own: a caller holding nothing is answered an empty set', async () => {
        const password = 'start123-check-ungranted';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));
        const grant = await suite.client.token.createWithPassword({ username: user.name, password });

        const response = await postCheck(suite, {}, { Authorization: `Bearer ${grant.access_token}` });

        expect(response.status).toBe(200);
        const result : AuthorizationCheckResult = await response.json();
        expect(entryOf(result, PermissionName.USER_UPDATE)).toBeUndefined();
        expect(entryOf(result, PermissionName.PERMISSION_READ)).toBeUndefined();
    });

    it('answers a realm-scoped grant for its own realm and not for a foreign one', async () => {
        const password = 'start123-check-reach';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));
        const { data: permission } = await suite.client.permission.getOne(PermissionName.USER_UPDATE);
        await suite.client.userPermission.create({
            userId: user.id,
            permissionId: permission.id,
            realmScope: RealmScope.OWN,
        });

        const { data: foreignRealm } = await suite.client.realm.create(createFakeRealm());
        const grant = await suite.client.token.createWithPassword({ username: user.name, password });
        const headers = { Authorization: `Bearer ${grant.access_token}` };

        const own = await postCheck(suite, { realms: RealmScope.OWN }, headers);
        expect(own.status).toBe(200);
        const ownResult : AuthorizationCheckResult = await own.json();
        expect(entryOf(ownResult, PermissionName.USER_UPDATE)?.realms).toEqual([user.realmId]);

        // `own` reaches neither a global row nor another realm's
        const wider = await postCheck(suite, { realms: [null, foreignRealm.id] }, headers);
        expect(wider.status).toBe(200);
        expect(entryOf(await wider.json(), PermissionName.USER_UPDATE)).toBeUndefined();

        // and the answer is per realm rather than per name: a realm it reaches
        // still comes back in the same call that refuses the two it does not
        const mixed = await postCheck(suite, { realms: [user.realmId, foreignRealm.id] }, headers);
        expect(entryOf(await mixed.json(), PermissionName.USER_UPDATE)?.realms).toEqual([user.realmId]);
    });

    it('answers the global rows too for an ownOrNull grant', async () => {
        const password = 'start123-check-own-or-null';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));
        const { data: permission } = await suite.client.permission.getOne(PermissionName.USER_READ);
        await suite.client.userPermission.create({
            userId: user.id,
            permissionId: permission.id,
            realmScope: RealmScope.OWN_OR_NULL,
        });

        const grant = await suite.client.token.createWithPassword({ username: user.name, password });
        const result = await suite.client.authorization.check(undefined, { authorizationHeader: { type: 'Bearer', token: grant.access_token } });

        expect(entryOf(result, PermissionName.USER_READ)?.realms).toEqual([user.realmId, null]);
        expect(entryOf(result, PermissionName.USER_UPDATE)).toBeUndefined();
    });

    it('refuses a body over the caps rather than evaluating it', async () => {
        const grant = await suite.client.token.createWithPassword({ username: 'admin', password: 'start123' });
        const headers = { Authorization: `Bearer ${grant.access_token}` };

        const names = Array.from({ length: 257 }, (_, index) => `permission_${index}`);
        const tooManyNames = await postCheck(suite, { names }, headers);
        expect(tooManyNames.status).toBe(400);

        const realms = Array.from({ length: 5 }, () => randomUUID());
        const tooManyRealms = await postCheck(suite, { realms }, headers);
        expect(tooManyRealms.status).toBe(400);

        // `any` is not offered: a caller that wants another realm names it
        const badSelector = await postCheck(suite, { realms: 'any' }, headers);
        expect(badSelector.status).toBe(400);
    });

    it('is not cached by an intermediary', async () => {
        const grant = await suite.client.token.createWithPassword({ username: 'admin', password: 'start123' });
        const response = await postCheck(suite, {}, { Authorization: `Bearer ${grant.access_token}` });

        expect(response.headers.get('cache-control')).toEqual('private, no-cache');
    });
});
