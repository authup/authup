/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User as UserEntity } from '@authup/core-kit';
import { PermissionName, REALM_MASTER_NAME } from '@authup/core-kit';
import { Client as HTTPClient } from '@authup/core-http-kit';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { createTestApplication } from '../../../../app';
import { createFakeUser } from '../../../../utils';

describe('http/controllers/user (self-manage)', () => {
    const suite = createTestApplication();

    let entity: UserEntity;
    let selfClient: HTTPClient;
    const knownPassword = 'self-manage-password-123';

    beforeAll(async () => {
        await suite.setup();

        const created = await suite.client.user.create({
            ...createFakeUser(),
            password: knownPassword,
            active: true,
        });
        entity = created;

        const permission = await suite.client.permission.getOne(PermissionName.USER_SELF_MANAGE);
        await suite.client.userPermission.create({
            user_id: entity.id,
            permission_id: permission.id,
        });

        const tokenResponse = await suite.client.token.createWithPassword({
            username: entity.name,
            password: knownPassword,
            realm_name: REALM_MASTER_NAME,
        });

        selfClient = new HTTPClient({ baseURL: suite.baseURL });
        selfClient.setAuthorizationHeader({
            type: 'Bearer',
            token: tokenResponse.access_token,
        });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    // ---- User entity column edits (denylist semantics) -----------------

    it('should allow user to update their own display_name (not in denylist)', async () => {
        const response = await selfClient.user.update(entity.id, { display_name: 'self-renamed' });

        expect(response.display_name).toBe('self-renamed');
    });

    it('should allow user to update their own first_name and last_name (not in denylist)', async () => {
        const response = await selfClient.user.update(entity.id, {
            first_name: 'Ada',
            last_name: 'Lovelace',
        });

        expect(response.first_name).toBe('Ada');
        expect(response.last_name).toBe('Lovelace');
    });

    it('should reject self-update of active flag (denylisted)', async () => {
        await expect(
            selfClient.user.update(entity.id, { active: false } as Partial<UserEntity>),
        ).rejects.toThrow();
    });

    it('should reject self-update of name_locked flag (denylisted)', async () => {
        await expect(
            selfClient.user.update(entity.id, { name_locked: true } as Partial<UserEntity>),
        ).rejects.toThrow();
    });

    it('should reject self-update of status (denylisted)', async () => {
        await expect(
            selfClient.user.update(entity.id, { status: 'banned' } as Partial<UserEntity>),
        ).rejects.toThrow();
    });

    it('should reject self-update of another user (not self)', async () => {
        const otherUser = await suite.client.user.create(createFakeUser());

        await expect(
            selfClient.user.update(otherUser.id, { display_name: 'hijacked' }),
        ).rejects.toThrow();
    });

    // ---- UserAttribute writes (open key namespace) ---------------------

    it('should allow user to create a UserAttribute with an arbitrary key', async () => {
        const response = await selfClient.userAttribute.create({
            name: 'theme',
            value: 'dark',
        });

        expect(response.name).toBe('theme');
        expect(response.value).toBe('dark');
        expect(response.user_id).toBe(entity.id);
    });

    it('should allow user to create a UserAttribute with another arbitrary key', async () => {
        const response = await selfClient.userAttribute.create({
            name: 'preferred_language',
            value: 'de-DE',
        });

        expect(response.name).toBe('preferred_language');
        expect(response.value).toBe('de-DE');
    });

    it('should reject creating a UserAttribute with a key that shadows a User column (reserved-name filter)', async () => {
        await expect(
            selfClient.userAttribute.create({
                name: 'email',
                value: 'foo@bar.test',
            }),
        ).rejects.toThrow();
    });

    it('should reject creating a UserAttribute with a denylisted key (active is a User column)', async () => {
        // `active` is in the policy denylist AND is a User column, so the
        // reserved-name filter rejects first; either way the write fails.
        await expect(
            selfClient.userAttribute.create({
                name: 'active',
                value: 'false',
            }),
        ).rejects.toThrow();
    });
});
