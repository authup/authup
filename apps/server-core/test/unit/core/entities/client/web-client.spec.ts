/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { Query } from '@rapiq/core';
import { CLIENT_WEB_NAME, ScopeName } from '@authup/core-kit';
import type { ClientScope } from '@authup/core-kit';
import { FakeEntityRepository } from '@authup/server-test-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import {
    WEB_CLIENT_SCOPE_NAMES,
    WebClientProvisioner,
    buildWebClientAttributes,
} from '../../../../../src/core/entities/client/web-client.ts';
import { FakeScopeRepository } from '../scope/fake-repository.ts';
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
        let scopeRepository: FakeScopeRepository;
        let clientScopeRepository: FakeEntityRepository<ClientScope>;
        let provisioner: WebClientProvisioner;

        const readScopeNames = async (clientId: string) => {
            const rows = await clientScopeRepository.findManyBy({ clientId });
            const scopes = await Promise.all(
                rows.map((row) => scopeRepository.findOneById(row.scopeId)),
            );

            return scopes.map((scope) => scope!.name).sort();
        };

        beforeEach(() => {
            repository = new FakeClientRepository();
            scopeRepository = new FakeScopeRepository();
            clientScopeRepository = new FakeEntityRepository<ClientScope>();

            // The built-in scopes are provisioned globally (realmId: null).
            scopeRepository.seed(WEB_CLIENT_SCOPE_NAMES.map((name) => ({
                name,
                realmId: null,
                builtIn: true,
            })));

            provisioner = new WebClientProvisioner({
                clientRepository: repository,
                scopeRepository,
                clientScopeRepository,
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

        // Regression (#3347): the declared `global openid` used to land in the
        // dead `scope` column only, leaving the client with no junction rows.
        // That junction is the sole source /authorize resolves scopes from.
        it('should bind the built-in scopes through the junction', async () => {
            const realmId = randomUUID();
            await provisioner.ensureForRealm({ id: realmId });

            const client = await repository.findOneBy({
                name: CLIENT_WEB_NAME,
                realmId,
            });

            expect(await readScopeNames(client!.id)).toEqual(
                [...WEB_CLIENT_SCOPE_NAMES].sort(),
            );

            const rows = await clientScopeRepository.findManyBy({ clientId: client!.id });
            expect(rows.every((row) => row.clientRealmId === realmId)).toBe(true);
            expect(rows.every((row) => row.scopeRealmId === null)).toBe(true);
        });

        it('should backfill missing scope rows for an already-provisioned client', async () => {
            const realmId = randomUUID();
            await provisioner.ensureForRealm({ id: realmId });

            const client = await repository.findOneBy({
                name: CLIENT_WEB_NAME,
                realmId,
            });

            // Drop the rows an instance provisioned before #3347 never had:
            // the client attributes are already current, so the dirty-check
            // short-circuits and the scopes must still be restored.
            clientScopeRepository.clear();

            await provisioner.ensureForRealm({ id: realmId });

            expect(await readScopeNames(client!.id)).toEqual(
                [...WEB_CLIENT_SCOPE_NAMES].sort(),
            );
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
            expect(clientScopeRepository.getAll()).toHaveLength(WEB_CLIENT_SCOPE_NAMES.length);
        });

        it('should keep a scope bound by hand', async () => {
            const realmId = randomUUID();
            await provisioner.ensureForRealm({ id: realmId });

            const client = await repository.findOneBy({
                name: CLIENT_WEB_NAME,
                realmId,
            });
            const extra = scopeRepository.seed({
                name: 'custom',
                realmId,
            });
            clientScopeRepository.seed({
                clientId: client!.id,
                clientRealmId: realmId,
                scopeId: extra.id,
                scopeRealmId: realmId,
            });

            await provisioner.ensureForRealm({ id: realmId });

            expect(await readScopeNames(client!.id)).toEqual(
                [...WEB_CLIENT_SCOPE_NAMES, 'custom'].sort(),
            );
        });

        it('should skip an unprovisioned scope', async () => {
            const realmId = randomUUID();
            scopeRepository.clear();

            await provisioner.ensureForRealm({ id: realmId });

            const client = await repository.findOneBy({
                name: CLIENT_WEB_NAME,
                realmId,
            });

            expect(client).not.toBeNull();
            expect(clientScopeRepository.getAll()).toHaveLength(0);
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
                },
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

        // `web` is a reserved client name, so the row belongs to the system: a
        // non-built-in one predates the reservation and must not shadow the
        // realm's login client.
        it('should take over a non-built-in client named web', async () => {
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
                },
            ]);

            await provisioner.ensureForRealm({ id: realmId });

            const existing = await repository.findOneBy({
                name: CLIENT_WEB_NAME,
                realmId,
            });

            expect(existing!.builtIn).toBe(true);
            expect(existing!.authMethod).toBe('none');
            expect(existing!.redirectUri).toBe(
                'http://localhost:3000/**,https://app.example.com/**',
            );
            expect(await readScopeNames(existing!.id)).toEqual(
                [...WEB_CLIENT_SCOPE_NAMES].sort(),
            );
        });
    });
});
