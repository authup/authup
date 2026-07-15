/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { CLIENT_WEB_NAME, ScopeName } from '@authup/core-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import {
    WebClientProvisioner,
    buildWebClientAttributes,
} from '../../../../../src/core/entities/client/web-client.ts';
import { FakeClientRepository } from './fake-repository.ts';

describe('core/entities/client/web-client', () => {
    const appOrigins = ['http://localhost:3000', 'https://app.example.com'];

    describe('buildWebClientAttributes', () => {
        it('should build a public built-in client with wildcard redirect uris', () => {
            const realmId = randomUUID();
            const attributes = buildWebClientAttributes({ id: realmId }, appOrigins);

            expect(attributes.name).toBe(CLIENT_WEB_NAME);
            expect(attributes.realm_id).toBe(realmId);
            expect(attributes.auth_method).toBe('none');
            expect(attributes.token_binding_method).toBe('none');
            expect(attributes.built_in).toBe(true);
            expect(attributes.active).toBe(true);
            expect(attributes.scope).toBe(`${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`);
            expect(attributes.redirect_uri).toBe(
                'http://localhost:3000/**,https://app.example.com/**',
            );
        });
    });

    describe('WebClientProvisioner.ensureForRealm', () => {
        let repository: FakeClientRepository;
        let provisioner: WebClientProvisioner;

        beforeEach(() => {
            repository = new FakeClientRepository();
            provisioner = new WebClientProvisioner({
                clientRepository: repository,
                appOrigins,
            });
        });

        it('should create the web client when none exists', async () => {
            const realmId = randomUUID();
            await provisioner.ensureForRealm({ id: realmId });

            const created = await repository.findOneBy({
                name: CLIENT_WEB_NAME,
                realm_id: realmId,
            });

            expect(created).not.toBeNull();
            expect(created!.built_in).toBe(true);
            expect(created!.auth_method).toBe('none');
            expect(created!.token_binding_method).toBe('none');
        });

        it('should be idempotent across repeated runs', async () => {
            const realmId = randomUUID();

            await provisioner.ensureForRealm({ id: realmId });
            await provisioner.ensureForRealm({ id: realmId });

            const result = await repository.findMany({});
            const webClients = result.data.filter(
                (c) => c.name === CLIENT_WEB_NAME && c.realm_id === realmId,
            );

            expect(webClients).toHaveLength(1);
        });

        it('should refresh redirect_uri on an existing built-in web client', async () => {
            const realmId = randomUUID();
            repository.seed([
                {
                    id: randomUUID(),
                    name: CLIENT_WEB_NAME,
                    realm_id: realmId,
                    built_in: true,
                    auth_method: 'none',
                    token_binding_method: 'none',
                    redirect_uri: 'http://stale.example.com/**',
                } as any,
            ]);

            await provisioner.ensureForRealm({ id: realmId });

            const updated = await repository.findOneBy({
                name: CLIENT_WEB_NAME,
                realm_id: realmId,
            });

            expect(updated!.redirect_uri).toBe(
                'http://localhost:3000/**,https://app.example.com/**',
            );
        });

        it('should not overwrite a non-built-in client named web', async () => {
            const realmId = randomUUID();
            repository.seed([
                {
                    id: randomUUID(),
                    name: CLIENT_WEB_NAME,
                    realm_id: realmId,
                    built_in: false,
                    auth_method: 'secret',
                    token_binding_method: 'none',
                    redirect_uri: 'http://user-owned.example.com/**',
                } as any,
            ]);

            await provisioner.ensureForRealm({ id: realmId });

            const existing = await repository.findOneBy({
                name: CLIENT_WEB_NAME,
                realm_id: realmId,
            });

            expect(existing!.built_in).toBe(false);
            expect(existing!.auth_method).toBe('secret');
            expect(existing!.redirect_uri).toBe('http://user-owned.example.com/**');
        });
    });
});
