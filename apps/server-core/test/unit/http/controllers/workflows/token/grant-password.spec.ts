/*
 * Copyright (c) 2021-2026.
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
import { ErrorCode } from '@authup/errors';
import {
    createFakeClient,
    createFakeRealm,
    createFakeUser,
    expectClientError,
} from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

describe('src/http/controllers/token', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should grant token with password', async () => {
        const response = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
            });

        expect(response).toBeDefined();
        expect(response.access_token).toBeDefined();
        expect(response.expires_in).toBeDefined();
        expect(response.refresh_token).toBeDefined();
    });

    it('should not grant token with password grant (credentials invalid)', async () => {
        await expectClientError(
            () => suite.client.token.createWithPassword({
                username: 'admin',
                password: 'foo-bar-baz',
            }),
            { status: 400, code: ErrorCode.ENTITY_CREDENTIALS_INVALID },
        );
    });

    it('should grant token with password and confidential client authentication', async () => {
        const secret = 'password-grant-test-secret';
        const client = await suite.client
            .client
            .create(createFakeClient({
                secret,
                secret_hashed: false,
                secret_encrypted: false,
                is_confidential: true,
            }));

        const response = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
                client_id: client.id,
                client_secret: secret,
            });

        expect(response.access_token).toBeDefined();
        expect(response.refresh_token).toBeDefined();
    });

    it('should reject password grant when confidential client provides wrong secret', async () => {
        const secret = 'password-grant-wrong-secret-test';
        const client = await suite.client
            .client
            .create(createFakeClient({
                secret,
                secret_hashed: false,
                secret_encrypted: false,
                is_confidential: true,
            }));

        await expectClientError(
            () => suite.client.token.createWithPassword({
                username: 'admin',
                password: 'start123',
                client_id: client.id,
                client_secret: 'wrong-secret',
            }),
            { status: 401, code: ErrorCode.OAUTH_CLIENT_INVALID },
        );
    });

    it('should not grant token with password grant (inactive)', async () => {
        const entity = await suite.client.user.create(createFakeUser({
            password: 'foo-bar-baz',
            active: false,
        }));

        await expectClientError(
            () => suite.client.token.createWithPassword({
                username: entity.name,
                password: 'foo-bar-baz',
            }),
            { status: 400, code: ErrorCode.ENTITY_INACTIVE },
        );

        await suite.client.user.update(entity.id, { active: true });

        const response = await suite.client
            .token
            .createWithPassword({
                username: entity.name,
                password: 'foo-bar-baz',
            });

        expect(response).toBeDefined();

        await expectClientError(
            () => suite.client.token.createWithPassword({
                username: entity.name,
                password: 'foo',
            }),
            { status: 400, code: ErrorCode.ENTITY_CREDENTIALS_INVALID },
        );
    });

    it('should default realm-less password grant to the master realm', async () => {
        const realm = await suite.client.realm.create(createFakeRealm());

        const { name } = createFakeUser();
        await suite.client.user.create(createFakeUser({
            name,
            password: 'master-secret-123',
        }));
        await suite.client.user.create(createFakeUser({
            name,
            realm_id: realm.id,
            password: 'other-secret-123',
        }));

        const response = await suite.client
            .token
            .createWithPassword({
                username: name,
                password: 'master-secret-123',
            });

        expect(response.access_token).toBeDefined();

        await expectClientError(
            () => suite.client.token.createWithPassword({
                username: name,
                password: 'other-secret-123',
            }),
            { status: 400, code: ErrorCode.ENTITY_CREDENTIALS_INVALID },
        );
    });

    it('should grant token with password for a realm selected via realm hint', async () => {
        const realm = await suite.client.realm.create(createFakeRealm());
        const user = await suite.client.user.create(createFakeUser({
            realm_id: realm.id,
            password: 'realm-user-secret',
        }));

        let response = await suite.client
            .token
            .createWithPassword({
                username: user.name,
                password: 'realm-user-secret',
                realm_id: realm.id,
            });

        expect(response.access_token).toBeDefined();

        response = await suite.client
            .token
            .createWithPassword({
                username: user.name,
                password: 'realm-user-secret',
                realm_id: realm.name,
            });

        expect(response.access_token).toBeDefined();

        response = await suite.client
            .token
            .createWithPassword({
                username: user.name,
                password: 'realm-user-secret',
                realm_name: realm.name,
            });

        expect(response.access_token).toBeDefined();

        response = await suite.client
            .token
            .createWithPassword({
                username: user.name,
                password: 'realm-user-secret',
                realm_name: ` ${realm.name.toUpperCase()} `,
            });

        expect(response.access_token).toBeDefined();

        response = await suite.client
            .token
            .createWithPassword({
                username: user.name,
                password: 'realm-user-secret',
                realm_id: '   ',
                realm_name: realm.name,
            });

        expect(response.access_token).toBeDefined();

        await expectClientError(
            () => suite.client.token.createWithPassword({
                username: user.name,
                password: 'realm-user-secret',
            }),
            { status: 400, code: ErrorCode.ENTITY_CREDENTIALS_INVALID },
        );
    });

    it('should scope name-identified confidential client authentication to the resolved realm', async () => {
        const realm = await suite.client.realm.create(createFakeRealm());
        const secret = 'client-realm-scope-secret';
        const client = await suite.client
            .client
            .create(createFakeClient({
                realm_id: realm.id,
                secret,
                secret_hashed: false,
                secret_encrypted: false,
                is_confidential: true,
            }));
        const user = await suite.client.user.create(createFakeUser({
            realm_id: realm.id,
            password: 'realm-user-secret',
        }));

        const response = await suite.client
            .token
            .createWithPassword({
                username: user.name,
                password: 'realm-user-secret',
                client_id: client.name,
                client_secret: secret,
                realm_id: realm.id,
            });

        expect(response.access_token).toBeDefined();

        const mixedCaseResponse = await suite.client
            .token
            .createWithPassword({
                username: user.name,
                password: 'realm-user-secret',
                client_id: client.name.toUpperCase(),
                client_secret: secret,
                realm_id: realm.id,
            });

        expect(mixedCaseResponse.access_token).toBeDefined();

        await expectClientError(
            () => suite.client.token.createWithPassword({
                username: 'admin',
                password: 'start123',
                client_id: client.name,
                client_secret: secret,
            }),
            { status: 401, code: ErrorCode.OAUTH_CLIENT_INVALID },
        );
    });

    it('should match a mixed-case username against the canonical stored name', async () => {
        const user = await suite.client.user.create(createFakeUser({ password: 'case-user-secret' }));

        const response = await suite.client
            .token
            .createWithPassword({
                username: ` ${user.name.toUpperCase()} `,
                password: 'case-user-secret',
            });

        expect(response.access_token).toBeDefined();
    });

    it('should fall back to the master realm for an unknown realm hint', async () => {
        const response = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
                realm_id: 'this-realm-does-not-exist',
            });

        expect(response.access_token).toBeDefined();
    });

    it('should resolve a UUID username globally regardless of realm hint', async () => {
        const realm = await suite.client.realm.create(createFakeRealm());
        const user = await suite.client.user.create(createFakeUser({
            realm_id: realm.id,
            password: 'uuid-user-secret',
        }));

        let response = await suite.client
            .token
            .createWithPassword({
                username: user.id,
                password: 'uuid-user-secret',
            });

        expect(response.access_token).toBeDefined();

        response = await suite.client
            .token
            .createWithPassword({
                username: user.id,
                password: 'uuid-user-secret',
                realm_name: 'master',
            });

        expect(response.access_token).toBeDefined();
    });
});
