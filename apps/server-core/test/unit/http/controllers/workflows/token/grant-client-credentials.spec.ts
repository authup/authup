/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import type { Client, Realm } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import { createFakeClient, createFakeRealm, expectClientError } from '../../../../../utils/index.ts';
import { createTestApplication } from '../../../../../app/index.ts';

function decodePayload(token: string) : Record<string, any> {
    return JSON.parse(new TextDecoder().decode(Uint8Array.fromBase64(token.split('.')[1], { alphabet: 'base64url' })));
}

describe('refresh-token', () => {
    const suite = createTestApplication();

    let entity : Client;

    beforeAll(async () => {
        await suite.setup();

        const input = createFakeClient();

        input.active = true;
        input.authMethod = 'secret';
        input.tokenBindingMethod = 'none';
        input.secretHashed = false;
        input.secretEncrypted = false;

        entity = (await suite.client.client.create(input)).data;
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should grant token with client credentials', async () => {
        const response = await suite.client
            .token
            .createWithClientCredentials({
                client_id: entity.id,
                client_secret: entity.secret!,
            });

        expect(response.access_token).toBeDefined();
        expect(response.expires_in).toBeDefined();
        expect(response.refresh_token).toBeUndefined();
    });

    it('should not grant with client-credentials (inactive)', async () => {
        await suite.client.client.update(entity.id, { active: false });

        try {
            await expectClientError(
                () => suite.client.token.createWithClientCredentials({
                    client_id: entity.id,
                    client_secret: entity.secret!,
                }),
                { status: 401, code: ErrorCode.OAUTH_CLIENT_INVALID },
            );
        } finally {
            await suite.client.client.update(entity.id, { active: true });
        }
    });

    it('should not grant with client-credentials (invalid credentials)', async () => {
        await expectClientError(
            () => suite.client.token.createWithClientCredentials({
                client_id: entity.id,
                client_secret: 'foo',
            }),
            { status: 401, code: ErrorCode.OAUTH_CLIENT_INVALID },
        );
    });

    describe('a client named in several realms', () => {
        let realmA : Realm;
        let realmB : Realm;
        let clientA : Client;
        let clientB : Client;

        beforeAll(async () => {
            realmA = (await suite.client.realm.create(createFakeRealm())).data;
            realmB = (await suite.client.realm.create(createFakeRealm())).data;

            const { name } = createFakeClient();
            const create = async (realm: Realm) => (await suite.client.client.create({
                ...createFakeClient({ name, realmId: realm.id }),
                active: true,
                secretHashed: false,
                secretEncrypted: false,
            })).data;

            clientA = await create(realmA);
            clientB = await create(realmB);
        });

        it('should resolve the name in the realm given by realm_name', async () => {
            for (const [realm, client] of [[realmA, clientA], [realmB, clientB]] as const) {
                const response = await suite.client.token.createWithClientCredentials({
                    client_id: client.name,
                    client_secret: client.secret!,
                    realm_name: realm.name,
                });

                const payload = decodePayload(response.access_token);

                expect(payload.realm_id).toEqual(realm.id);
                expect(payload.sub).toEqual(client.id);
            }
        });

        it('should resolve the name in the realm given by realm_id', async () => {
            for (const [realm, client] of [[realmA, clientA], [realmB, clientB]] as const) {
                const response = await suite.client.token.createWithClientCredentials({
                    client_id: client.name,
                    client_secret: client.secret!,
                    realm_id: realm.id,
                });

                const payload = decodePayload(response.access_token);

                expect(payload.realm_id).toEqual(realm.id);
                expect(payload.sub).toEqual(client.id);
            }
        });

        it('should not grant with the secret of the same-named client in another realm', async () => {
            for (const [realm, client] of [[realmA, clientB], [realmB, clientA]] as const) {
                await expectClientError(
                    () => suite.client.token.createWithClientCredentials({
                        client_id: client.name,
                        client_secret: client.secret!,
                        realm_name: realm.name,
                    }),
                    { status: 401, code: ErrorCode.OAUTH_CLIENT_INVALID },
                );
            }
        });
    });
});
