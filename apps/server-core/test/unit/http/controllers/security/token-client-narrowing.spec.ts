/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Permission, User } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import type { OAuth2TokenIntrospectionResponse } from '@authup/specs';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createTestApplication } from '../../../../app';
import {
    createFakeClient,
    createFakePermission,
    createFakeRole,
    createFakeUser,
    httpRequest,
} from '../../../../utils';

/**
 * A user's client-owned grants apply only through that client's tokens
 * (#3597): a permission owned by client X, and a role owned by X together with
 * the GLOBAL permissions it carries, are withheld from a token issued to client
 * Y. A request without a token client (a clientless password grant, Basic, the
 * console cookie) narrows nothing.
 *
 * The same narrowing has to hold on every surface that answers the question,
 * or a resource server evaluating the introspected grants locally reaches a
 * different verdict than the server: request gates, the batch check, both
 * introspection endpoints, and delegation.
 */
describe('http/controllers/security (token client narrowing)', () => {
    const suite = createTestApplication();

    const secret = 'token-client-secret-123';
    const password = 'token-client-password-123';

    let clientX : Client;
    let clientY : Client;
    let permissionX : Permission;
    let user : User;

    const tokens : Record<'x' | 'y' | 'none', string> = {
        x: '', 
        y: '', 
        none: '', 
    };

    function bearer(token: string) {
        return { authorization: `Bearer ${token}` };
    }

    async function createConfidentialClient() {
        const { data } = await suite.client.client.create({
            ...createFakeClient(),
            active: true,
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret,
            secretHashed: false,
            secretEncrypted: false,
        });

        return data;
    }

    async function passwordToken(username: string, userPassword: string, client?: Client) {
        const grant = await suite.client.token.createWithPassword({
            username,
            password: userPassword,
            ...(client ? { client_id: client.id, client_secret: secret } : {}),
        });

        return grant.access_token;
    }

    async function introspectedNames(token: string, authorization: Record<string, string>) {
        const response = await httpRequest(suite, 'POST', '/token/introspect', {
            headers: authorization,
            form: { token },
        });
        expect(response.status).toEqual(200);

        const body = await response.json() as OAuth2TokenIntrospectionResponse;
        expect(body.active).toBe(true);

        return (body.permissions ?? []).map((entry) => entry.name);
    }

    beforeAll(async () => {
        await suite.setup();

        clientX = await createConfidentialClient();
        clientY = await createConfidentialClient();

        ({ data: permissionX } = await suite.client.permission.create({
            ...createFakePermission(),
            clientId: clientX.id,
        }));

        const { data: roleRead } = await suite.client.permission.getOne(PermissionName.ROLE_READ);
        const { data: userRead } = await suite.client.permission.getOne(PermissionName.USER_READ);

        // a role OWNED by X carrying a GLOBAL permission
        const { data: roleX } = await suite.client.role.create(createFakeRole({ clientId: clientX.id }));
        await suite.client.rolePermission.create({ roleId: roleX.id, permissionId: roleRead.id });

        // a global role carrying a global permission
        const { data: roleGlobal } = await suite.client.role.create(createFakeRole());
        await suite.client.rolePermission.create({ roleId: roleGlobal.id, permissionId: userRead.id });

        ({ data: user } = await suite.client.user.create(createFakeUser({ password })));
        await suite.client.userPermission.create({ userId: user.id, permissionId: permissionX.id });
        await suite.client.userRole.create({ userId: user.id, roleId: roleX.id });
        await suite.client.userRole.create({ userId: user.id, roleId: roleGlobal.id });

        tokens.x = await passwordToken(user.name, password, clientX);
        tokens.y = await passwordToken(user.name, password, clientY);
        tokens.none = await passwordToken(user.name, password);
    });

    afterAll(async () => {
        await suite.teardown();
    });

    describe('introspection', () => {
        it('should report the client\'s own grants for a token issued to that client', async () => {
            const names = await introspectedNames(tokens.x, bearer(tokens.x));

            expect(names).toEqual(expect.arrayContaining([permissionX.name, PermissionName.ROLE_READ, PermissionName.USER_READ]));
        });

        it('should withhold another client\'s grants, and the global grants of its roles', async () => {
            const names = await introspectedNames(tokens.y, bearer(tokens.y));

            expect(names).toContain(PermissionName.USER_READ);
            expect(names).not.toContain(permissionX.name);
            expect(names).not.toContain(PermissionName.ROLE_READ);
        });

        it('should narrow nothing for a token issued to no client', async () => {
            const names = await introspectedNames(tokens.none, bearer(tokens.none));

            expect(names).toEqual(expect.arrayContaining([permissionX.name, PermissionName.ROLE_READ, PermissionName.USER_READ]));
        });

        it('should narrow by the introspected token, never by the caller', async () => {
            const basic = Buffer.from('admin:start123').toString('base64');
            const names = await introspectedNames(tokens.y, { authorization: `Basic ${basic}` });

            expect(names).not.toContain(permissionX.name);
            expect(names).not.toContain(PermissionName.ROLE_READ);
        });

        it('should narrow GET /sessions/@me/introspect by the bearer\'s client', async () => {
            const response = await httpRequest(suite, 'GET', '/sessions/@me/introspect', { headers: bearer(tokens.y) });
            expect(response.status).toEqual(200);

            const body = await response.json() as OAuth2TokenIntrospectionResponse;
            const names = (body.permissions ?? []).map((entry) => entry.name);

            expect(names.sort()).toEqual((await introspectedNames(tokens.y, bearer(tokens.y))).sort());
        });
    });

    describe('request evaluation', () => {
        it('should gate a route on the grants the token reaches', async () => {
            const statuses = await Promise.all([tokens.x, tokens.y, tokens.none].map(async (token) => {
                const response = await httpRequest(suite, 'GET', '/roles', { headers: bearer(token) });
                return response.status;
            }));

            expect(statuses).toEqual([200, 403, 200]);
        });

        it('should answer the batch check with the grants the token reaches', async () => {
            const holds = await Promise.all([tokens.x, tokens.y].map(async (token) => {
                const response = await httpRequest(suite, 'POST', '/authorization/check', {
                    headers: { ...bearer(token), 'content-type': 'application/json' },
                    body: JSON.stringify({ names: [PermissionName.ROLE_READ] }),
                });
                expect(response.status).toEqual(200);

                const body = await response.json() as { name: string }[];
                return body.some((entry) => entry.name === PermissionName.ROLE_READ);
            }));

            expect(holds).toEqual([true, false]);
        });
    });

    describe('delegation', () => {
        it('should not assign a role whose permissions the actor holds only through another client', async () => {
            const { data: userRoleCreate } = await suite.client.permission.getOne(PermissionName.USER_ROLE_CREATE);
            await suite.client.userPermission.create({ userId: user.id, permissionId: userRoleCreate.id });

            const { data: roleRead } = await suite.client.permission.getOne(PermissionName.ROLE_READ);
            const { data: role } = await suite.client.role.create(createFakeRole());
            await suite.client.rolePermission.create({ roleId: role.id, permissionId: roleRead.id });

            const { data: target } = await suite.client.user.create(createFakeUser());

            const assign = (token: string) => httpRequest(suite, 'POST', '/user-roles', {
                headers: { ...bearer(token), 'content-type': 'application/json' },
                body: JSON.stringify({ userId: target.id, roleId: role.id }),
            });

            expect((await assign(tokens.y)).status).toEqual(403);
            expect((await assign(tokens.x)).status).toEqual(201);
        });

        it('should not bind a client-owned permission through another client\'s token', async () => {
            const adminY = await passwordToken('admin', 'start123', clientY);
            const adminX = await passwordToken('admin', 'start123', clientX);

            const bind = async (token: string) => {
                const { data: target } = await suite.client.user.create(createFakeUser());

                return httpRequest(suite, 'POST', '/user-permissions', {
                    headers: { ...bearer(token), 'content-type': 'application/json' },
                    body: JSON.stringify({ userId: target.id, permissionId: permissionX.id }),
                });
            };

            expect((await bind(adminY)).status).toEqual(403);
            expect((await bind(adminX)).status).toEqual(201);
        });
    });
});
