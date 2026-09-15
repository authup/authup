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
import { BuiltInPolicyType, RealmScope } from '@authup/access';
import type { IdentityProvider, Realm, User } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import { Client as HTTPClient } from '@authup/core-http-kit';
import { generateOAuth2CodeVerifier } from '../../../../../src/core';
import { IdentityProviderAccountEntity, UserEntity } from '../../../../../src/adapters/database/domains';
import {
    createFakeClient,
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

    // the realm-isolation pair (issue #3601). `reader` holds a policy-free
    // grant, so `compile()` answers `conditional` and the reach runs as a SQL
    // WHERE — that is the branch with exact totals, and a `fields=` projection
    // there proves nothing. `postReader` carries a non-lowerable
    // ATTRIBUTE_NAMES policy, which forces the per-row branch, and that is the
    // only branch where the force-select matters.
    let reader: HTTPClient;
    const readerSecret = 'idp-account-iso-reader-secret';
    let postReader: HTTPClient;
    const postReaderSecret = 'idp-account-iso-post-reader-secret';

    let ownAccountId: string;
    let foreignAccountId: string;

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

        // one own / foreign pair, told apart by `userRealmId` alone — the
        // column the compiled reach binds
        const { data: realmB } = await suite.client.realm.create(createFakeRealm());
        const { data: providerB } = await suite.client.identityProvider.create(
            createFakeOAuth2IdentityProvider({ realmId: realmB.id }),
        );

        const ownSubject = await createRealmUser(realm.id);
        ({ id: ownAccountId } = await seedAccount({ userId: ownSubject.id, userRealmId: realm.id }));

        const foreignSubject = await createRealmUser(realmB.id);
        ({ id: foreignAccountId } = await seedAccount({
            userId: foreignSubject.id,
            userRealmId: realmB.id,
            providerId: providerB.id,
        }));

        // the readers live in realm A, so `ownOrNull` reaches exactly the own
        // row above. Both are CLIENT identities, so the ownership alternative
        // is never composed for them and the reach is the only thing deciding
        // a row.
        const createReader = async (secret: string, policyId?: string) => {
            const { data: client } = await suite.client.client.create({
                ...createFakeClient({ realmId: realm.id }),
                authMethod: 'secret',
                tokenBindingMethod: 'none',
                secret,
                secretHashed: false,
                secretEncrypted: false,
            });

            const { data: permission } = await suite.client.permission.getOne(
                PermissionName.IDENTITY_PROVIDER_ACCOUNT_READ,
            );
            await suite.client.clientPermission.create({
                clientId: client.id,
                permissionId: permission.id,
                realmScope: RealmScope.OWN_OR_NULL,
                ...(policyId ? { policyId } : {}),
            });

            const token = await suite.client.token.createWithClientCredentials({
                client_id: client.id,
                client_secret: secret,
            });

            const http = new HTTPClient({ baseURL: suite.baseURL });
            http.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });
            return http;
        };

        reader = await createReader(readerSecret);

        // inverted over a name no entity carries, so it always passes and the
        // realm reach stays the only thing deciding a row — it is there to be
        // non-lowerable, not to deny
        const { data: postPolicy } = await suite.client.policy.create({
            name: 'idp-account-iso-non-lowerable',
            type: BuiltInPolicyType.ATTRIBUTE_NAMES,
            invert: true,
            names: ['aFieldNoEntityCarries'],
        } as any);
        postReader = await createReader(postReaderSecret, postPolicy.id);
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

    it('should allow unlinking a password-less user account when another remains', async () => {
        // the guard's transaction must NOT over-block: with two links, a
        // password-less user can still remove one.
        const secondProvider = (await suite.client.identityProvider.create(createFakeOAuth2IdentityProvider({ realmId: realm.id }))).data;

        const subject = await createRealmUser(realm.id, null);
        const first = await seedAccount({ userId: subject.id, userRealmId: realm.id });
        await seedAccount({
            userId: subject.id, 
            userRealmId: realm.id, 
            providerId: secondProvider.id, 
        });

        const response = await suite.client.delete(`identity-provider-accounts/${first.id}`);
        expect(response.status).toEqual(202);

        const after = await suite.client.get(`identity-provider-accounts?filter[userId]=${subject.id}`);
        expect(after.data.data).toHaveLength(1);

        // and now it is the last one — the guard blocks removing it
        await expectClientError(
            () => suite.client.delete(`identity-provider-accounts/${after.data.data[0].id}`),
            { status: 400, code: ErrorCode.IDENTITY_PROVIDER_ACCOUNT_UNLINK_BLOCKED },
        );
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

    it('pages an own-realm row exactly, never short and never over-counted', async () => {
        // the conversion's point, and the one assertion the per-row drop loop
        // cannot satisfy whatever the row order happens to be (issue #3601):
        // over a two-row match taken one at a time, the reach as a WHERE always
        // answers total 1 and the own row. The loop fetches from the UNSCOPED
        // set instead, so it answers either total 1 with an EMPTY page (the
        // foreign row sorted first and was dropped) or total 2 with the own row
        // (it sorted first) — a short page, or an upper-bound total.
        const response = await reader.identityProviderAccount.getMany({
            filters: { id: [ownAccountId, foreignAccountId] },
            pagination: { limit: 1 },
        });

        expect(response.data).toHaveLength(1);
        expect(response.data[0]!.id).toEqual(ownAccountId);
        expect(response.meta.total).toEqual(1);
    });

    it('never lists a foreign-realm row', async () => {
        const response = await reader.identityProviderAccount.getMany({ filters: { id: foreignAccountId } });

        expect(response.data).toHaveLength(0);
        expect(response.meta.total).toEqual(0);
    });

    it('holds the gate on the post branch when the owner realm is projected away', async () => {
        // the force-select is what keeps `userRealmId` on the row the per-row
        // gate reads; without it the realm-match key is `null`, which an
        // `ownOrNull` reader reaches — i.e. it fails OPEN
        const own = await postReader.get(`identity-provider-accounts?filter[id]=${ownAccountId}&fields=id`);
        expect(own.data.data.some((row: { id: string }) => row.id === ownAccountId)).toBe(true);

        const foreign = await postReader.get(`identity-provider-accounts?filter[id]=${foreignAccountId}&fields=id`);
        expect(foreign.data.data).toHaveLength(0);
        expect(foreign.data.meta.total).toEqual(0);
    });

    it('still lists a user its own rows when the grant reaches no realm', async () => {
        // the ownership alternative on the `deny` branch: a `none` grant passes
        // the name-level pre-gate but compiles to a reach that matches nothing,
        // so the self term is all that is left — the per-row `isOwnedBy`
        // short-circuit expressed as SQL.
        const password = generateOAuth2CodeVerifier();
        const { data: subject } = await suite.client.user.create(createFakeUser({
            realmId: realm.id,
            password,
        }));

        const { data: permission } = await suite.client.permission.getOne(
            PermissionName.IDENTITY_PROVIDER_ACCOUNT_READ,
        );
        await suite.client.userPermission.create({
            userId: subject.id,
            permissionId: permission.id,
            realmScope: RealmScope.NONE,
        });

        const own = await seedAccount({ userId: subject.id, userRealmId: realm.id });

        const login = await suite.client.token.createWithPassword({
            username: subject.name,
            password,
            realm_id: realm.id,
        });
        const http = new HTTPClient({ baseURL: suite.baseURL });
        http.setAuthorizationHeader({ type: 'Bearer', token: login.access_token });

        const response = await http.get('identity-provider-accounts');
        const rows = response.data.data;

        expect(rows).toHaveLength(1);
        expect(rows[0].id).toEqual(own.id);
        expect(response.data.meta.total).toEqual(1);
    });

    it('still reaches a row whose owner realm is null', async () => {
        // `user_realm_id` is nullable, and the per-row path this replaced read
        // it as `entity.userRealmId ?? null`, which `ownOrNull` matches. The
        // compiled form has to say the same thing in SQL — an `eq(col, null)`
        // lowered to `= NULL` instead of `IS NULL` would silently drop every
        // such row, which is the one divergence class the conversion can
        // introduce. Runs LAST: it seeds a row the counts above would see.
        const subject = await createRealmUser(realm.id);
        const nullRealmAccount = await seedAccount({ userId: subject.id, userRealmId: null });

        const response = await reader.identityProviderAccount.getMany({ filters: { id: nullRealmAccount.id } });

        expect(response.data).toHaveLength(1);
        expect(response.meta.total).toEqual(1);
    });
});
