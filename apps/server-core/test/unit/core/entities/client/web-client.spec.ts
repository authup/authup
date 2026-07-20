/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { Query } from '@rapiq/core';
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
            expect(attributes.realmId).toBe(realmId);
            expect(attributes.authMethod).toBe('none');
            expect(attributes.tokenBindingMethod).toBe('none');
            expect(attributes.builtIn).toBe(true);
            expect(attributes.active).toBe(true);
            expect(attributes.scope).toBe(`${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`);
            expect(attributes.redirectUri).toBe(
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
                realmId,
            });

            expect(created).not.toBeNull();
            expect(created!.builtIn).toBe(true);
            expect(created!.authMethod).toBe('none');
            expect(created!.tokenBindingMethod).toBe('none');
        });

        it('should be idempotent across repeated runs', async () => {
            const realmId = randomUUID();

            await provisioner.ensureForRealm({ id: realmId });
            await provisioner.ensureForRealm({ id: realmId });

            const result = await repository.findMany(new Query({}));
            const webClients = result.data.filter(
                (c) => c.name === CLIENT_WEB_NAME && c.realmId === realmId,
            );

            expect(webClients).toHaveLength(1);
        });

        it('should refresh redirectUri on an existing built-in web client', async () => {
            const realmId = randomUUID();
            repository.seed([
                {
                    id: randomUUID(),
                    name: CLIENT_WEB_NAME,
                    realmId,
                    builtIn: true,
                    authMethod: 'none',
                    tokenBindingMethod: 'none',
                    redirectUri: 'http://stale.example.com/**',
                } as any,
            ]);

            await provisioner.ensureForRealm({ id: realmId });

            const updated = await repository.findOneBy({
                name: CLIENT_WEB_NAME,
                realmId,
            });

            expect(updated!.redirectUri).toBe(
                'http://localhost:3000/**,https://app.example.com/**',
            );
        });

        it('should not overwrite a non-built-in client named web', async () => {
            const realmId = randomUUID();
            repository.seed([
                {
                    id: randomUUID(),
                    name: CLIENT_WEB_NAME,
                    realmId,
                    builtIn: false,
                    authMethod: 'secret',
                    tokenBindingMethod: 'none',
                    redirectUri: 'http://user-owned.example.com/**',
                } as any,
            ]);

            await provisioner.ensureForRealm({ id: realmId });

            const existing = await repository.findOneBy({
                name: CLIENT_WEB_NAME,
                realmId,
            });

            expect(existing!.builtIn).toBe(false);
            expect(existing!.authMethod).toBe('secret');
            expect(existing!.redirectUri).toBe('http://user-owned.example.com/**');
        });
    });
});
