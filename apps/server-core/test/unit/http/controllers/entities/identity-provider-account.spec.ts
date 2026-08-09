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
import type { IdentityProvider, Realm, User } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import { Client as HTTPClient } from '@authup/core-http-kit';
import { generateOAuth2CodeVerifier } from '../../../../../src/core';
import { IdentityProviderAccountEntity, UserEntity } from '../../../../../src/adapters/database/domains';
import {
    createFakeOAuth2IdentityProvider,
    createFakeRealm,
    createFakeUser,
    expectClientError,
} from '../../../../utils';
import { createTestApplication } from '../../../../app';

describe('identity-provider-account', () => {
    const suite = createTestApplication();

    let realm: Realm;
    let provider: IdentityProvider;
    let user: User;
    let userClient: HTTPClient;

    beforeAll(async () => {
        await suite.setup();

        realm = (await suite.client.realm.create(createFakeRealm())).data;
        provider = (await suite.client.identityProvider.create(createFakeOAuth2IdentityProvider({ realmId: realm.id }))).data;

        const password = generateOAuth2CodeVerifier();
        user = (await suite.client.user.create(createFakeUser({
            realmId: realm.id,
            password,
        }))).data;

        const login = await suite.client.token.createWithPassword({
            username: user.name,
            password,
            realm_id: realm.id,
        });

        userClient = new HTTPClient({ baseURL: suite.baseURL });
        userClient.setAuthorizationHeader({ type: 'Bearer', token: login.access_token });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    async function seedAccount(input: {
        userId: string,
        userRealmId: string | null,
        providerId?: string,
        providerUserId?: string,
    }) {
        const repository = suite.dataSource.getRepository(IdentityProviderAccountEntity);
        return repository.save(repository.create({
            providerId: input.providerId || provider.id,
            providerRealmId: input.userRealmId,
            providerUserId: input.providerUserId || randomUUID(),
            providerUserName: 'external-name',
            accessToken: 'external-access-token',
            refreshToken: 'external-refresh-token',
            userId: input.userId,
            userRealmId: input.userRealmId,
        }));
    }

    async function createRealmUser(realmId: string, password?: string | null) {
        const secret = generateOAuth2CodeVerifier();
        const { data: created } = await suite.client.user.create(createFakeUser({
            realmId,
            password: secret,
        }));

        if (password === null) {
            await suite.dataSource.getRepository(UserEntity)
                .update({ id: created.id }, { password: null });
        }

        return created;
    }

    it('should read and delete rows as admin', async () => {
        const subject = await createRealmUser(realm.id);
        const account = await seedAccount({ userId: subject.id, userRealmId: realm.id });

        const collection = await suite.client.get(`identity-provider-accounts?filter[userId]=${subject.id}`);
        expect(collection.data.data).toHaveLength(1);
        expect(collection.data.data[0].id).toEqual(account.id);
        expect(collection.data.data[0].providerUserName).toEqual('external-name');

        const record = await suite.client.get(`identity-provider-accounts/${account.id}`);
        expect(record.data.data.id).toEqual(account.id);

        const removed = await suite.client.delete(`identity-provider-accounts/${account.id}`);
        expect(removed.status).toEqual(202);

        const after = await suite.client.get(`identity-provider-accounts?filter[userId]=${subject.id}`);
        expect(after.data.data).toHaveLength(0);
    });

    it('should force-scope a permission-less user to its own rows and never ship tokens', async () => {
        const own = await seedAccount({ userId: user.id, userRealmId: realm.id });
        const foreignSubject = await createRealmUser(realm.id);
        await seedAccount({ userId: foreignSubject.id, userRealmId: realm.id });

        const response = await userClient.get('identity-provider-accounts');
        const rows = response.data.data;

        expect(rows).toHaveLength(1);
        expect(rows[0].id).toEqual(own.id);
        expect(rows[0]).not.toHaveProperty('accessToken');
        expect(rows[0]).not.toHaveProperty('refreshToken');

        await suite.client.delete(`identity-provider-accounts/${own.id}`);
    });

    it('should never ship the external tokens even when explicitly projected', async () => {
        // accessToken/refreshToken are ordinary selectable columns kept off
        // the wire only by omission from the schema allow-list
        // (SCHEMA_FIELD_EXCLUSIONS). A client explicitly requesting them via
        // a fields projection must NOT surface them (the projection derives
        // from the allow-list and drops non-listed columns; it must never
        // fall back to select-all when every requested field is disallowed).
        const account = await seedAccount({ userId: user.id, userRealmId: realm.id });

        const explicit = [
            `identity-provider-accounts?filter[userId]=${user.id}&fields=accessToken,refreshToken`,
            `identity-provider-accounts?filter[userId]=${user.id}&fields[identityProviderAccount]=accessToken`,
            `identity-provider-accounts?filter[userId]=${user.id}&fields=+accessToken`,
        ];

        for (const path of explicit) {
            const response = await suite.client.get(path);
            const rows = response.data.data;
            expect(rows.length).toBeGreaterThanOrEqual(1);
            for (const row of rows) {
                expect(row).not.toHaveProperty('accessToken');
                expect(row).not.toHaveProperty('refreshToken');
            }
        }

        // and the single-record read path
        const record = await suite.client.get(`identity-provider-accounts/${account.id}?fields=accessToken,refreshToken`);
        expect(record.data.data).not.toHaveProperty('accessToken');
        expect(record.data.data).not.toHaveProperty('refreshToken');

        await suite.client.delete(`identity-provider-accounts/${account.id}`);
    });

    it('should let a user delete its own row', async () => {
        const account = await seedAccount({ userId: user.id, userRealmId: realm.id });

        const response = await userClient.delete(`identity-provider-accounts/${account.id}`);
        expect(response.status).toEqual(202);
    });

    it('should block unlinking the last account of a password-less user', async () => {
        const subject = await createRealmUser(realm.id, null);
        const account = await seedAccount({ userId: subject.id, userRealmId: realm.id });

        await expectClientError(
            () => suite.client.delete(`identity-provider-accounts/${account.id}`),
            { status: 400, code: ErrorCode.IDENTITY_PROVIDER_ACCOUNT_UNLINK_BLOCKED },
        );

        const after = await suite.client.get(`identity-provider-accounts?filter[userId]=${subject.id}`);
        expect(after.data.data).toHaveLength(1);
    });

    it('should scope the nested realm mount', async () => {
        const otherRealm = (await suite.client.realm.create(createFakeRealm())).data;
        const otherProvider = (await suite.client.identityProvider.create(createFakeOAuth2IdentityProvider({ realmId: otherRealm.id }))).data;
        const otherSubject = await createRealmUser(otherRealm.id);
        const otherAccount = await seedAccount({
            userId: otherSubject.id,
            userRealmId: otherRealm.id,
            providerId: otherProvider.id,
        });

        const subject = await createRealmUser(realm.id);
        await seedAccount({ userId: subject.id, userRealmId: realm.id });

        const collection = await suite.client.get(`realms/${realm.id}/identity-provider-accounts`);
        const realmIds = collection.data.data.map((row: { userRealmId: string }) => row.userRealmId);
        expect(realmIds.length).toBeGreaterThanOrEqual(1);
        expect(realmIds.every((id: string) => id === realm.id)).toBe(true);

        await expectClientError(
            () => suite.client.get(`realms/${realm.id}/identity-provider-accounts/${otherAccount.id}`),
            { status: 404 },
        );
    });
});
