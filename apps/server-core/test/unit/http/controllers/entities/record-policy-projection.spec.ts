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

    describe('client list with the secret requested', () => {
        const secret = 'record-policy-projection-stored-secret';

        let reader: HTTPClient;
        let target: Client;

        beforeAll(async () => {
            ({ data: target } = await suite.client.client.create({
                ...createFakeClient(),
                realmId,
                secret,
                secretHashed: false,
                secretEncrypted: false,
            }));

            // the second child cannot be lowered, so the list is decided per
            // row and the secret gate has no permission leg to stand on
            reader = await createReader('record-policy-projection-client-secret', PermissionName.CLIENT_READ, {
                name: 'record-policy-projection-client-secret',
                type: BuiltInPolicyType.COMPOSITE,
                decisionStrategy: 'unanimous',
                invert: false,
                children: [
                    {
                        name: 'record-policy-projection-client-secret-name',
                        type: BuiltInPolicyType.ATTRIBUTES,
                        invert: false,
                        query: { name: { $ne: 'a-name-no-client-carries' } },
                    },
                    {
                        name: 'record-policy-projection-client-secret-names',
                        type: BuiltInPolicyType.ATTRIBUTE_NAMES,
                        invert: true,
                        names: ['aFieldNoEntityCarries'],
                    },
                ],
            });
        });

        it('should show the secret to a reader the gate admits', async () => {
            const { data } = await suite.client.client.getMany({
                filters: { id: target.id },
                fields: ['id', 'secret'],
            });

            expect(data).toHaveLength(1);
            expect(data[0]!.secret).toEqual(secret);
        });

        it('should withhold the secret and answer no column beyond the projection', async () => {
            const { data } = await reader.client.getMany({
                filters: { id: target.id },
                fields: ['id', 'secret'],
            });

            expect(data).toEqual([{ id: target.id, realmId }]);
            expect(JSON.stringify(data)).not.toContain(secret);
        });
    });

    describe('user policy on a column outside the default row', () => {
        const nonLowerable = (name: string) => ({
            name,
            type: BuiltInPolicyType.ATTRIBUTE_NAMES,
            invert: true,
            names: ['aFieldNoEntityCarries'],
        });

        let withheld: User;
        let readable: User;
        let withheldEmail: string;
        let readableEmail: string;

        let recordReader: HTTPClient;
        let listReader: HTTPClient;
        let matchReader: HTTPClient;

        beforeAll(async () => {
            const withheldInput = createFakeUser({ realmId });
            const readableInput = createFakeUser({ realmId });

            withheldEmail = withheldInput.email;
            readableEmail = readableInput.email;

            ({ data: withheld } = await suite.client.user.create(withheldInput));
            ({ data: readable } = await suite.client.user.create(readableInput));

            recordReader = await createReader('record-policy-projection-email', PermissionName.USER_READ, {
                name: 'record-policy-projection-email',
                type: BuiltInPolicyType.ATTRIBUTES,
                invert: false,
                query: { email: { $ne: withheldEmail } },
            });

            listReader = await createReader('record-policy-projection-email-list', PermissionName.USER_READ, {
                name: 'record-policy-projection-email-list',
                type: BuiltInPolicyType.COMPOSITE,
                decisionStrategy: 'unanimous',
                invert: false,
                children: [
                    {
                        name: 'record-policy-projection-email-list-email',
                        type: BuiltInPolicyType.ATTRIBUTES,
                        invert: false,
                        query: { email: { $ne: withheldEmail } },
                    },
                    nonLowerable('record-policy-projection-email-list-names'),
                ],
            });

            matchReader = await createReader('record-policy-projection-email-match', PermissionName.USER_READ, {
                name: 'record-policy-projection-email-match',
                type: BuiltInPolicyType.COMPOSITE,
                decisionStrategy: 'unanimous',
                invert: false,
                children: [
                    {
                        name: 'record-policy-projection-email-match-email',
                        type: BuiltInPolicyType.ATTRIBUTES,
                        invert: false,
                        query: { email: readableEmail },
                    },
                    nonLowerable('record-policy-projection-email-match-names'),
                ],
            });
        });

        it('should refuse the record read, unprojected and projected', async () => {
            await expectClientError(
                () => recordReader.user.getOne(withheld.id),
                { status: 403, code: ErrorCode.PERMISSION_EVALUATION_FAILED },
            );

            await expectClientError(
                () => recordReader.user.getOne(withheld.id, { fields: ['id', 'name'] }),
                { status: 403, code: ErrorCode.PERMISSION_EVALUATION_FAILED },
            );
        });

        it('should answer a readable record without the column', async () => {
            const { data: unprojected } = await recordReader.user.getOne(readable.id);
            const { data: reference } = await suite.client.user.getOne(readable.id);

            expect(unprojected).toEqual(reference);
            expect(Object.keys(unprojected)).toEqual(Object.keys(reference));
            expect(unprojected).not.toHaveProperty('email');

            const { data: projected } = await recordReader.user.getOne(readable.id, { fields: ['id', 'name'] });

            expect(projected).toEqual({
                id: readable.id,
                name: readable.name,
                realmId,
            });
        });

        it('should withhold the row from a list decided per row, unprojected and projected', async () => {
            const { data: unprojected } = await listReader.user.getMany({ filters: { name: withheld.name } });

            expect(unprojected).toEqual([]);

            const { data: projected } = await listReader.user.getMany({
                filters: { name: withheld.name },
                fields: ['id', 'name'],
            });

            expect(projected).toEqual([]);
        });

        it('should answer a readable row of such a list without the column', async () => {
            const { data: unprojected } = await listReader.user.getMany({ filters: { name: readable.name } });
            const { data: reference } = await suite.client.user.getMany({ filters: { name: readable.name } });

            expect(unprojected).toHaveLength(1);
            expect(unprojected).toEqual(reference);
            expect(Object.keys(unprojected[0]!)).toEqual(Object.keys(reference[0]!));
            expect(unprojected[0]).not.toHaveProperty('email');

            const { data: projected } = await listReader.user.getMany({
                filters: { name: readable.name },
                fields: ['id', 'name'],
            });

            expect(projected).toEqual([{
                id: readable.id,
                name: readable.name,
                realmId,
            }]);
        });

        it('should answer the row a condition on the column matches', async () => {
            const { data: record } = await matchReader.user.getOne(readable.id);

            expect(record.id).toEqual(readable.id);
            expect(record).not.toHaveProperty('email');

            const { data: list } = await matchReader.user.getMany({ filters: { name: readable.name } });

            expect(list.map((row) => row.id)).toEqual([readable.id]);
            expect(list[0]).not.toHaveProperty('email');

            const { data: other } = await matchReader.user.getMany({ filters: { name: withheld.name } });

            expect(other).toEqual([]);
        });

        it('should answer the column to a read that asks for it', async () => {
            const { data: record } = await recordReader.user.getOne(readable.id, { fields: ['id', 'email'] });

            expect(record).toEqual({
                id: readable.id,
                email: readableEmail,
                realmId,
            });

            const { data: list } = await listReader.user.getMany({
                filters: { name: readable.name },
                fields: ['id', 'email'],
            });

            expect(list).toEqual([{
                id: readable.id,
                email: readableEmail,
                realmId,
            }]);

            const { data: admin } = await suite.client.user.getOne(readable.id, { fields: ['id', 'email'] });

            expect(admin.email).toEqual(readableEmail);
        });
    });
});
