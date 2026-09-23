/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, RealmScope } from '@authup/access';
import { PermissionName } from '@authup/core-kit';
import type { Client } from '@authup/core-kit';
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
import { createFakeClient, expectClientError } from '../../../../utils';

/**
 * Regression (issue #3654), end to end through the real policy engine: a
 * CLIENT_UPDATE grant restricted by an ATTRIBUTES junction policy on `pathId`
 * must not be able to refile a client INTO its folder, nor move one out.
 */
describe('client update reach (#3654)', () => {
    const suite = createTestApplication();

    let delegate: HTTPClient;
    const delegateSecret = 'client-update-reach-secret';

    let folderId: string;
    let otherFolderId: string;
    let outside: Client;
    let inside: Client;

    beforeAll(async () => {
        await suite.setup();

        const { data: realm } = await suite.client.realm.getOne('master');

        ({ data: { id: folderId } } = await suite.client.path.create({ name: 'reach-analyses', realmId: realm.id }));
        ({ data: { id: otherFolderId } } = await suite.client.path.create({ name: 'reach-other', realmId: realm.id }));

        ({ data: outside } = await suite.client.client.create({ ...createFakeClient(), realmId: realm.id }));
        ({ data: inside } = await suite.client.client.create({
            ...createFakeClient(),
            realmId: realm.id,
            pathId: folderId,
        }));

        const { data: policy } = await suite.client.policy.create({
            name: 'client-update-reach-analyses',
            type: BuiltInPolicyType.ATTRIBUTES,
            query: { pathId: { $in: [folderId] } },
        } as any);

        const { data: delegateClient } = await suite.client.client.create({
            ...createFakeClient(),
            realmId: realm.id,
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret: delegateSecret,
            secretHashed: false,
            secretEncrypted: false,
        });
        const { data: permission } = await suite.client.permission.getOne(PermissionName.CLIENT_UPDATE);
        await suite.client.clientPermission.create({
            clientId: delegateClient.id,
            permissionId: permission.id,
            realmScope: RealmScope.OWN,
            policyId: policy.id,
        });

        const token = await suite.client.token.createWithClientCredentials({
            client_id: delegateClient.id,
            client_secret: delegateSecret,
        });
        delegate = new HTTPClient({ baseURL: suite.baseURL });
        delegate.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should refuse refiling an unreachable client into the folder', async () => {
        await expectClientError(
            () => delegate.client.update(outside.id, { pathId: folderId }),
            { status: 403, code: ErrorCode.PERMISSION_EVALUATION_FAILED },
        );

        const { data: current } = await suite.client.client.getOne(outside.id);
        expect(current.pathId).toBeNull();
    });

    it('should update a client that stays in the folder', async () => {
        const { data } = await delegate.client.update(inside.id, { displayName: 'still inside' });
        expect(data.displayName).toEqual('still inside');
    });

    it('should refuse moving a client out of the folder', async () => {
        await expectClientError(
            () => delegate.client.update(inside.id, { pathId: otherFolderId }),
            { status: 403, code: ErrorCode.PERMISSION_EVALUATION_FAILED },
        );

        const { data: current } = await suite.client.client.getOne(inside.id);
        expect(current.pathId).toEqual(folderId);
    });
});
