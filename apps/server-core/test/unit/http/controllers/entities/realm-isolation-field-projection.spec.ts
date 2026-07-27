/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RealmScope } from '@authup/access';
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
import {
    createFakeClient,
    createFakeRealm,
    createFakeRoleAttribute,
    createFakeUser,
    createFakeUserAttribute,
} from '../../../../utils';

/**
 * Regression (plan 039): an own-scoped `<ENTITY>_READ` holder must not be able
 * to surface another realm's rows by projecting `realmId` (or the other
 * columns the per-row gate reads) out of the SQL SELECT via `fields[...]` —
 * that would otherwise neutralize the per-row realmScope gate.
 */
describe('realm isolation (field projection)', () => {
    const suite = createTestApplication();

    let actor: HTTPClient;
    let readerActor: HTTPClient;

    let ownUserId: string;
    let foreignUserId: string;

    let ownClientId: string;
    let foreignClientId: string;
    const ownClientSecret = 'realm-iso-own-client-secret';
    const foreignClientSecret = 'realm-iso-foreign-client-secret';

    let ownRoleAttributeId: string;
    let foreignRoleAttributeId: string;

    let ownUserAttributeId: string;
    let foreignUserAttributeId: string;

    const actorSecret = 'realm-iso-actor-secret';
    const readerActorSecret = 'realm-iso-reader-actor-secret';

    beforeAll(async () => {
        await suite.setup();

        const { data: realmB } = await suite.client.realm.create(createFakeRealm());

        const { data: ownUser } = await suite.client.user.create(createFakeUser());
        ownUserId = ownUser.id;
        const { data: foreignUser } = await suite.client.user.create(createFakeUser({ realmId: realmB.id }));
        foreignUserId = foreignUser.id;

        const { data: ownClient } = await suite.client.client.create({
            ...createFakeClient(),
            secret: ownClientSecret,
            secretHashed: false,
            secretEncrypted: false,
        });
        ownClientId = ownClient.id;
        const { data: foreignClient } = await suite.client.client.create({
            ...createFakeClient(),
            realmId: realmB.id,
            secret: foreignClientSecret,
            secretHashed: false,
            secretEncrypted: false,
        });
        foreignClientId = foreignClient.id;

        const { data: ownRole } = await suite.client.role.create({ name: 'realm-iso-own-role' });
        const { data: ownRoleAttribute } = await suite.client.roleAttribute.create({
            ...createFakeRoleAttribute(),
            roleId: ownRole.id,
        });
        ownRoleAttributeId = ownRoleAttribute.id;
        const { data: foreignRole } = await suite.client.role.create({ name: 'realm-iso-foreign-role', realmId: realmB.id });
        const { data: foreignRoleAttribute } = await suite.client.roleAttribute.create({
            ...createFakeRoleAttribute(),
            roleId: foreignRole.id,
        });
        foreignRoleAttributeId = foreignRoleAttribute.id;

        const { data: ownUserAttribute } = await suite.client.userAttribute.create(
            createFakeUserAttribute({ userId: ownUser.id }),
        );
        ownUserAttributeId = ownUserAttribute.id;
        const { data: foreignUserAttribute } = await suite.client.userAttribute.create(
            createFakeUserAttribute({ userId: foreignUser.id }),
        );
        foreignUserAttributeId = foreignUserAttribute.id;

        // a restricted actor in master holding the READ permissions at the default `own` scope
        const { data: actorClient } = await suite.client.client.create({
            ...createFakeClient(),
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret: actorSecret,
            secretHashed: false,
            secretEncrypted: false,
        });
        const permissionNames = [
            PermissionName.USER_READ,
            PermissionName.USER_UPDATE,
            PermissionName.CLIENT_READ,
            PermissionName.ROLE_READ,
        ];
        for (const name of permissionNames) {
            const { data: permission } = await suite.client.permission.getOne(name);
            await suite.client.clientPermission.create({
                clientId: actorClient.id,
                permissionId: permission.id,
            });
        }

        const token = await suite.client.token.createWithClientCredentials({
            client_id: actorClient.id,
            client_secret: actorSecret,
        });
        actor = new HTTPClient({ baseURL: suite.baseURL });
        actor.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });

        // a reader at `ownOrNull` scope (realm_admin read reach) — the scope for
        // which a stripped realmId reads as a null/global resource and leaks
        const { data: readerClient } = await suite.client.client.create({
            ...createFakeClient(),
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret: readerActorSecret,
            secretHashed: false,
            secretEncrypted: false,
        });
        const { data: userRead } = await suite.client.permission.getOne(PermissionName.USER_READ);
        await suite.client.clientPermission.create({
            clientId: readerClient.id,
            permissionId: userRead.id,
            realmScope: RealmScope.OWN_OR_NULL,
        });
        const readerToken = await suite.client.token.createWithClientCredentials({
            client_id: readerClient.id,
            client_secret: readerActorSecret,
        });
        readerActor = new HTTPClient({ baseURL: suite.baseURL });
        readerActor.setAuthorizationHeader({ type: 'Bearer', token: readerToken.access_token });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('keeps a foreign-realm user hidden even when realmId is projected away', async () => {
        const own = await actor.user.getMany({ filters: { id: ownUserId }, fields: ['id', 'name'] });
        expect(own.data.some((entity) => entity.id === ownUserId)).toBe(true);

        const foreign = await actor.user.getMany({ filters: { id: foreignUserId }, fields: ['id', 'name'] });
        expect(foreign.data.some((entity) => entity.id === foreignUserId)).toBe(false);
    });

    it('keeps a foreign-realm user hidden from an ownOrNull-scoped reader when realmId is projected away', async () => {
        const own = await readerActor.user.getMany({ filters: { id: ownUserId }, fields: ['id', 'name'] });
        expect(own.data.some((entity) => entity.id === ownUserId)).toBe(true);

        const foreign = await readerActor.user.getMany({ filters: { id: foreignUserId }, fields: ['id', 'name'] });
        expect(foreign.data.some((entity) => entity.id === foreignUserId)).toBe(false);
    });

    it('keeps a foreign-realm plaintext client secret hidden even when realmId and the secret flags are projected away', async () => {
        const own = await actor.client.getMany({ filters: { id: ownClientId }, fields: ['id', 'secret'] });
        const ownEntity = own.data.find((entity) => entity.id === ownClientId);
        expect(ownEntity).toBeDefined();
        expect(ownEntity!.secret).toEqual(ownClientSecret);

        // since #3322 the schema-level gate REDACTS the secret instead of
        // dropping the row — the list stays complete, the value stays hidden
        const foreign = await actor.client.getMany({ filters: { id: foreignClientId }, fields: ['id', 'secret'] });
        const foreignEntity = foreign.data.find((entity) => entity.id === foreignClientId);
        expect(foreignEntity).toBeDefined();
        expect(foreignEntity!.secret).toBeUndefined();
    });

    it('keeps a foreign-realm role-attribute hidden even when a field projection is attempted', async () => {
        const own = await actor.roleAttribute.getMany({ filters: { id: ownRoleAttributeId }, fields: ['id', 'name'] });
        expect(own.data.some((entity) => entity.id === ownRoleAttributeId)).toBe(true);

        const foreign = await actor.roleAttribute.getMany({ filters: { id: foreignRoleAttributeId }, fields: ['id', 'name'] });
        expect(foreign.data.some((entity) => entity.id === foreignRoleAttributeId)).toBe(false);
    });

    it('keeps a foreign-realm user-attribute hidden even when a field projection is attempted', async () => {
        const own = await actor.userAttribute.getMany({ filters: { id: ownUserAttributeId }, fields: ['id', 'name'] });
        expect(own.data.some((entity) => entity.id === ownUserAttributeId)).toBe(true);

        const foreign = await actor.userAttribute.getMany({ filters: { id: foreignUserAttributeId }, fields: ['id', 'name'] });
        expect(foreign.data.some((entity) => entity.id === foreignUserAttributeId)).toBe(false);
    });
});
