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
import { createFakeClient, createFakeRealm, expectClientError } from '../../../../utils';

/**
 * A realm update is evaluated with the realm as its own record realm, so a
 * REALM_UPDATE grant at `own` reach updates the actor's own realm and no
 * other. Before, the update carried no record realm at all and the reach
 * factor neutral-passed, so an `own` grant updated every realm.
 */
describe('realm update reach', () => {
    const suite = createTestApplication();

    let actor: HTTPClient;
    let ownRealmId: string;
    let foreignRealmId: string;

    beforeAll(async () => {
        await suite.setup();

        const { data: ownRealm } = await suite.client.realm.create(createFakeRealm());
        ownRealmId = ownRealm.id;
        const { data: foreignRealm } = await suite.client.realm.create(createFakeRealm());
        foreignRealmId = foreignRealm.id;

        const secret = 'realm-update-reach-secret';
        const { data: client } = await suite.client.client.create({
            ...createFakeClient({ realmId: ownRealmId }),
            secret,
            secretHashed: false,
            secretEncrypted: false,
        });

        const { data: permission } = await suite.client.permission.getOne(PermissionName.REALM_UPDATE);
        await suite.client.clientPermission.create({
            clientId: client.id,
            permissionId: permission.id,
            realmScope: RealmScope.OWN,
        });

        const token = await suite.client.token.createWithClientCredentials({
            client_id: client.id,
            client_secret: secret,
        });
        actor = new HTTPClient({ baseURL: suite.baseURL });
        actor.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('updates the actor\'s own realm', async () => {
        const { data } = await actor.realm.update(ownRealmId, { description: 'updated by its own realm' });
        expect(data.description).toEqual('updated by its own realm');
    });

    it('refuses to update a foreign realm', async () => {
        await expectClientError(
            () => actor.realm.update(foreignRealmId, { description: 'updated from a foreign realm' }),
            { status: 403 },
        );

        const { data } = await suite.client.realm.getOne(foreignRealmId);
        expect(data.description).not.toEqual('updated from a foreign realm');
    });
});
