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
    createFakeRobot,
    createFakeRoleAttribute,
    createFakeUser,
    createFakeUserAttribute,
} from '../../../../utils';

/**
 * Regression (plan 039): an own-scoped `<ENTITY>_READ` holder must not be able
 * to surface another realm's rows by projecting `realm_id` (or the other
 * columns the per-row gate reads) out of the SQL SELECT via `fields[...]` —
 * that would otherwise neutralize the per-row realm_scope gate.
 */
describe('realm isolation (field projection)', () => {
    const suite = createTestApplication();

    let actor: HTTPClient;
    let readerActor: HTTPClient;

    let ownUserId: string;
    let foreignUserId: string;

    let ownRobotId: string;
    let foreignRobotId: string;

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

        const realmB = await suite.client.realm.create(createFakeRealm());

        const ownUser = await suite.client.user.create(createFakeUser());
        ownUserId = ownUser.id;
        const foreignUser = await suite.client.user.create(createFakeUser({ realm_id: realmB.id }));
        foreignUserId = foreignUser.id;

        const ownRobot = await suite.client.robot.create(createFakeRobot());
        ownRobotId = ownRobot.id;
        const foreignRobot = await suite.client.robot.create(createFakeRobot({ realm_id: realmB.id }));
        foreignRobotId = foreignRobot.id;

        const ownClient = await suite.client.client.create({
            ...createFakeClient(),
            secret: ownClientSecret,
            secret_hashed: false,
            secret_encrypted: false,
        });
        ownClientId = ownClient.id;
        const foreignClient = await suite.client.client.create({
            ...createFakeClient(),
            realm_id: realmB.id,
            secret: foreignClientSecret,
            secret_hashed: false,
            secret_encrypted: false,
        });
        foreignClientId = foreignClient.id;

        const ownRole = await suite.client.role.create({ name: 'realm-iso-own-role' });
        const ownRoleAttribute = await suite.client.roleAttribute.create({
            ...createFakeRoleAttribute(),
            role_id: ownRole.id,
        });
        ownRoleAttributeId = ownRoleAttribute.id;
        const foreignRole = await suite.client.role.create({ name: 'realm-iso-foreign-role', realm_id: realmB.id });
        const foreignRoleAttribute = await suite.client.roleAttribute.create({
            ...createFakeRoleAttribute(),
            role_id: foreignRole.id,
        });
        foreignRoleAttributeId = foreignRoleAttribute.id;

        const ownUserAttribute = await suite.client.userAttribute.create(
            createFakeUserAttribute({ user_id: ownUser.id }),
        );
        ownUserAttributeId = ownUserAttribute.id;
        const foreignUserAttribute = await suite.client.userAttribute.create(
            createFakeUserAttribute({ user_id: foreignUser.id }),
        );
        foreignUserAttributeId = foreignUserAttribute.id;

        // a restricted actor in master holding the READ permissions at the default `own` scope
        const actorClient = await suite.client.client.create({
            ...createFakeClient(),
            is_confidential: true,
            secret: actorSecret,
            secret_hashed: false,
            secret_encrypted: false,
        });
        const permissionNames = [
            PermissionName.USER_READ,
            PermissionName.USER_UPDATE,
            PermissionName.ROBOT_READ,
            PermissionName.CLIENT_READ,
            PermissionName.ROLE_READ,
        ];
        for (const name of permissionNames) {
            const permission = await suite.client.permission.getOne(name);
            await suite.client.clientPermission.create({
                client_id: actorClient.id,
                permission_id: permission.id,
            });
        }

        const token = await suite.client.token.createWithClientCredentials({
            client_id: actorClient.id,
            client_secret: actorSecret,
        });
        actor = new HTTPClient({ baseURL: suite.baseURL });
        actor.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });

        // a reader at `ownOrNull` scope (realm_admin read reach) — the scope for
        // which a stripped realm_id reads as a null/global resource and leaks
        const readerClient = await suite.client.client.create({
            ...createFakeClient(),
            is_confidential: true,
            secret: readerActorSecret,
            secret_hashed: false,
            secret_encrypted: false,
        });
        const userRead = await suite.client.permission.getOne(PermissionName.USER_READ);
        await suite.client.clientPermission.create({
            client_id: readerClient.id,
            permission_id: userRead.id,
            realm_scope: RealmScope.OWN_OR_NULL,
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

    it('keeps a foreign-realm user hidden even when realm_id is projected away', async () => {
        const own = await actor.user.getMany({ filter: { id: ownUserId }, fields: ['id', 'name'] });
        expect(own.data.some((entity) => entity.id === ownUserId)).toBe(true);

        const foreign = await actor.user.getMany({ filter: { id: foreignUserId }, fields: ['id', 'name'] });
        expect(foreign.data.some((entity) => entity.id === foreignUserId)).toBe(false);
    });

    it('keeps a foreign-realm user hidden from an ownOrNull-scoped reader when realm_id is projected away', async () => {
        const own = await readerActor.user.getMany({ filter: { id: ownUserId }, fields: ['id', 'name'] });
        expect(own.data.some((entity) => entity.id === ownUserId)).toBe(true);

        const foreign = await readerActor.user.getMany({ filter: { id: foreignUserId }, fields: ['id', 'name'] });
        expect(foreign.data.some((entity) => entity.id === foreignUserId)).toBe(false);
    });

    it('keeps a foreign-realm robot hidden even when realm_id is projected away', async () => {
        const own = await actor.robot.getMany({ filter: { id: ownRobotId }, fields: ['id', 'name'] });
        expect(own.data.some((entity) => entity.id === ownRobotId)).toBe(true);

        const foreign = await actor.robot.getMany({ filter: { id: foreignRobotId }, fields: ['id', 'name'] });
        expect(foreign.data.some((entity) => entity.id === foreignRobotId)).toBe(false);
    });

    it('keeps a foreign-realm plaintext client secret hidden even when realm_id and the secret flags are projected away', async () => {
        const own = await actor.client.getMany({ filter: { id: ownClientId }, fields: ['id', 'secret'] });
        const ownEntity = own.data.find((entity) => entity.id === ownClientId);
        expect(ownEntity).toBeDefined();
        expect(ownEntity!.secret).toEqual(ownClientSecret);

        const foreign = await actor.client.getMany({ filter: { id: foreignClientId }, fields: ['id', 'secret'] });
        expect(foreign.data.some((entity) => entity.id === foreignClientId)).toBe(false);
    });

    it('keeps a foreign-realm role-attribute hidden even when a field projection is attempted', async () => {
        const own = await actor.roleAttribute.getMany({ filter: { id: ownRoleAttributeId }, fields: ['id', 'name'] });
        expect(own.data.some((entity) => entity.id === ownRoleAttributeId)).toBe(true);

        const foreign = await actor.roleAttribute.getMany({ filter: { id: foreignRoleAttributeId }, fields: ['id', 'name'] });
        expect(foreign.data.some((entity) => entity.id === foreignRoleAttributeId)).toBe(false);
    });

    it('keeps a foreign-realm user-attribute hidden even when a field projection is attempted', async () => {
        const own = await actor.userAttribute.getMany({ filter: { id: ownUserAttributeId }, fields: ['id', 'name'] });
        expect(own.data.some((entity) => entity.id === ownUserAttributeId)).toBe(true);

        const foreign = await actor.userAttribute.getMany({ filter: { id: foreignUserAttributeId }, fields: ['id', 'name'] });
        expect(foreign.data.some((entity) => entity.id === foreignUserAttributeId)).toBe(false);
    });
});
