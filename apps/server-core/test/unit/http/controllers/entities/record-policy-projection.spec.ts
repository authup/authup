/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, RealmScope } from '@authup/access';
import { PermissionName } from '@authup/core-kit';
import type { Client, Role, User } from '@authup/core-kit';
import { Client as HTTPClient } from '@authup/core-http-kit';
import { ErrorCode } from '@authup/errors';
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
    createFakeRole,
    createFakeUser,
    expectClientError,
} from '../../../../utils';

/**
 * A record policy is evaluated on the row, whatever part of it the request
 * projects, and the response carries the projection the request asked for.
 */
describe('record policy (field projection)', () => {
    const suite = createTestApplication();

    let realmId: string;

    const createReader = async (
        secret: string,
        permissionName: `${PermissionName}`,
        policy: Record<string, any>,
    ): Promise<HTTPClient> => {
        const { data: created } = await suite.client.policy.create(policy as any);

        const { data: client } = await suite.client.client.create({
            ...createFakeClient(),
            realmId,
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret,
            secretHashed: false,
            secretEncrypted: false,
        });
        const { data: permission } = await suite.client.permission.getOne(permissionName);

        await suite.client.clientPermission.create({
            clientId: client.id,
            permissionId: permission.id,
            realmScope: RealmScope.OWN,
            policyId: created.id,
        });

        const token = await suite.client.token.createWithClientCredentials({
            client_id: client.id,
            client_secret: secret,
        });

        const reader = new HTTPClient({ baseURL: suite.baseURL });

        reader.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });

        return reader;
    };

    beforeAll(async () => {
        await suite.setup();

        ({ data: { id: realmId } } = await suite.client.realm.getOne('master'));
    });

    afterAll(async () => {
        await suite.teardown();
    });

    describe('role list', () => {
        let reader: HTTPClient;
        let withheld: Role;
        let readable: Role;

        beforeAll(async () => {
            ({ data: withheld } = await suite.client.role.create({ ...createFakeRole(), realmId }));
            ({ data: readable } = await suite.client.role.create({ ...createFakeRole(), realmId }));

            // the second child cannot be lowered, so the list is decided per row
            reader = await createReader('record-policy-projection-role', PermissionName.ROLE_READ, {
                name: 'record-policy-projection-role',
                type: BuiltInPolicyType.COMPOSITE,
                decisionStrategy: 'unanimous',
                invert: false,
                children: [
                    {
                        name: 'record-policy-projection-role-name',
                        type: BuiltInPolicyType.ATTRIBUTES,
                        invert: false,
                        query: { name: { $ne: withheld.name } },
                    },
                    {
                        name: 'record-policy-projection-role-names',
                        type: BuiltInPolicyType.ATTRIBUTE_NAMES,
                        invert: true,
                        names: ['aFieldNoEntityCarries'],
                    },
                ],
            });
        });

        it('should withhold the row from an unprojected read', async () => {
            const { data } = await reader.role.getMany({ filters: { name: withheld.name } });

            expect(data).toEqual([]);
        });

        it('should withhold the row from a projected read', async () => {
            const { data } = await reader.role.getMany({
                filters: { name: withheld.name },
                fields: ['id', 'description'],
            });

            expect(data).toEqual([]);
        });

        it('should answer a readable row with the requested projection', async () => {
            const { data } = await reader.role.getMany({
                filters: { name: readable.name },
                fields: ['id', 'description'],
            });

            expect(data).toHaveLength(1);
            expect(Object.keys(data[0]!).sort()).toEqual(['description', 'id', 'realmId']);
            expect(data[0]).toEqual({
                id: readable.id,
                description: readable.description,
                realmId,
            });
        });
    });

    describe('user role list', () => {
        let reader: HTTPClient;
        let userId: string;
        let readableId: string;

        beforeAll(async () => {
            const { data: user } = await suite.client.user.create({ ...createFakeUser(), realmId });
            const { data: withheldRole } = await suite.client.role.create({ ...createFakeRole(), realmId });
            const { data: readableRole } = await suite.client.role.create({ ...createFakeRole(), realmId });

            userId = user.id;

            await suite.client.userRole.create({ userId, roleId: withheldRole.id });
            ({ data: { id: readableId } } = await suite.client.userRole.create({ userId, roleId: readableRole.id }));

            reader = await createReader('record-policy-projection-user-role', PermissionName.USER_ROLE_READ, {
                name: 'record-policy-projection-user-role',
                type: BuiltInPolicyType.COMPOSITE,
                decisionStrategy: 'unanimous',
                invert: false,
                children: [
                    {
                        name: 'record-policy-projection-user-role-role',
                        type: BuiltInPolicyType.ATTRIBUTES,
                        invert: false,
                        query: { roleId: { $ne: withheldRole.id } },
                    },
                    {
                        name: 'record-policy-projection-user-role-names',
                        type: BuiltInPolicyType.ATTRIBUTE_NAMES,
                        invert: true,
                        names: ['aFieldNoEntityCarries'],
                    },
                ],
            });
        });

        it('should decide an unprojected and a projected read alike', async () => {
            const { data: unprojected } = await reader.userRole.getMany({ filters: { userId } });

            expect(unprojected.map((row) => row.id)).toEqual([readableId]);

            const { data: projected } = await reader.userRole.getMany({
                filters: { userId },
                fields: ['id', 'userId'],
            });

            expect(projected).toEqual([{
                id: readableId,
                userId,
                userRealmId: realmId,
            }]);
        });
    });

    describe('user record', () => {
        let reader: HTTPClient;
        let withheld: User;
        let readable: User;

        beforeAll(async () => {
            ({ data: withheld } = await suite.client.user.create({ ...createFakeUser(), realmId }));
            ({ data: readable } = await suite.client.user.create({ ...createFakeUser(), realmId }));

            reader = await createReader('record-policy-projection-user', PermissionName.USER_READ, {
                name: 'record-policy-projection-user',
                type: BuiltInPolicyType.ATTRIBUTES,
                invert: false,
                query: { name: { $ne: withheld.name } },
            });
        });

        it('should refuse an unprojected and a projected read alike', async () => {
            await expectClientError(
                () => reader.user.getOne(withheld.id),
                { status: 403, code: ErrorCode.PERMISSION_EVALUATION_FAILED },
            );

            await expectClientError(
                () => reader.user.getOne(withheld.id, { fields: ['id', 'displayName'] }),
                { status: 403, code: ErrorCode.PERMISSION_EVALUATION_FAILED },
            );
        });

        it('should answer a readable row with the requested projection', async () => {
            const { data } = await reader.user.getOne(readable.id, { fields: ['id', 'displayName'] });

            expect(data).toEqual({
                id: readable.id,
                displayName: readable.displayName,
                realmId,
            });
        });

        it('should answer an unprojected read with the default row', async () => {
            const { data } = await reader.user.getOne(readable.id);

            expect(data.name).toEqual(readable.name);
            expect(data).not.toHaveProperty('email');
        });
    });

    describe('client record', () => {
        let reader: HTTPClient;
        let withheld: Client;
        let readable: Client;

        beforeAll(async () => {
            ({ data: withheld } = await suite.client.client.create({ ...createFakeClient(), realmId }));
            ({ data: readable } = await suite.client.client.create({ ...createFakeClient(), realmId }));

            reader = await createReader('record-policy-projection-client', PermissionName.CLIENT_READ, {
                name: 'record-policy-projection-client',
                type: BuiltInPolicyType.ATTRIBUTES,
                invert: false,
                query: { name: { $ne: withheld.name } },
            });
        });

        it('should refuse an unprojected and a projected read alike', async () => {
            await expectClientError(
                () => reader.client.getOne(withheld.id),
                { status: 403, code: ErrorCode.PERMISSION_EVALUATION_FAILED },
            );

            await expectClientError(
                () => reader.client.getOne(withheld.id, { fields: ['id', 'displayName'] }),
                { status: 403, code: ErrorCode.PERMISSION_EVALUATION_FAILED },
            );
        });

        it('should answer a readable row with the requested projection', async () => {
            const { data } = await reader.client.getOne(readable.id, { fields: ['id', 'displayName'] });

            expect(data).toEqual({
                id: readable.id,
                displayName: readable.displayName,
                realmId,
            });
        });
    });
});
