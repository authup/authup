/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { Query } from '@rapiq/core';
import {
    CLIENT_ACCOUNT_CONSOLE_NAME,
    CLIENT_ADMIN_CONSOLE_NAME,
    CLIENT_WEB_NAME,
    ScopeName,
} from '@authup/core-kit';
import type { ClientScope } from '@authup/core-kit';
import { FakeEntityRepository } from '@authup/server-test-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import {
    SYSTEM_CLIENT_DEFINITIONS,
    SYSTEM_CLIENT_SCOPE_NAMES,
    SystemClientProvisioner,
    buildSystemClientAttributes,
} from '../../../../../src/core/entities/client/system-clients.ts';
import { FakeScopeRepository } from '../scope/fake-repository.ts';
import { FakeClientRepository } from './fake-repository.ts';

const webDefinition = SYSTEM_CLIENT_DEFINITIONS
    .find((definition) => definition.name === CLIENT_WEB_NAME)!;

describe('core/entities/client/system-clients', () => {
    const appOrigins = ['http://localhost:3000', 'https://app.example.com'];

    it('should declare the web, admin-console and account-console clients', () => {
        expect(SYSTEM_CLIENT_DEFINITIONS.map((definition) => definition.name)).toEqual([
            CLIENT_WEB_NAME,
            CLIENT_ADMIN_CONSOLE_NAME,
            CLIENT_ACCOUNT_CONSOLE_NAME,
        ]);
    });

    describe('buildSystemClientAttributes', () => {
        it('should build a public built-in client with wildcard redirect uris', () => {
            const realmId = randomUUID();
            const attributes = buildSystemClientAttributes(webDefinition, { id: realmId }, appOrigins);

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

        // Every definition shares the app-origin redirect set on purpose:
        // redirectUri is re-asserted each boot, so a separately-hosted
        // surface registers its origin via TRUSTED_ORIGINS (plan 078
        // "relocatable by choice") instead of editing the client row.
        it('should apply the definition name onto the shared attribute shape', () => {
            const realmId = randomUUID();

            for (const definition of SYSTEM_CLIENT_DEFINITIONS) {
                const attributes = buildSystemClientAttributes(definition, { id: realmId }, appOrigins);

                expect(attributes.name).toBe(definition.name);
                expect(attributes.builtIn).toBe(true);
                expect(attributes.authMethod).toBe('none');
                expect(attributes.grantTypes).toBe('authorization_code refresh_token');
                expect(attributes.redirectUri).toBe(
                    'http://localhost:3000/**,https://app.example.com/**',
                );
                // seeded at CREATE only, never part of the MERGE-owned set
                expect(attributes.displayName).toBeUndefined();
                expect(attributes.accessPolicyId).toBeUndefined();
            }
        });
    });

    describe('SystemClientProvisioner.ensureForRealm', () => {
        let repository: FakeClientRepository;
        let scopeRepository: FakeScopeRepository;
        let clientScopeRepository: FakeEntityRepository<ClientScope>;
        let provisioner: SystemClientProvisioner;

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
            scopeRepository.seed(SYSTEM_CLIENT_SCOPE_NAMES.map((name) => ({
                name,
                realmId: null,
                builtIn: true,
            })));

            provisioner = new SystemClientProvisioner({
                clientRepository: repository,
                scopeRepository,
                clientScopeRepository,
                appOrigins,
            });
        });

        it('should create every system client when none exists', async () => {
            const realmId = randomUUID();
            await provisioner.ensureForRealm({ id: realmId });

            for (const definition of SYSTEM_CLIENT_DEFINITIONS) {
                const created = await repository.findOneBy({
                    name: definition.name,
                    realmId,
                });

                expect(created, definition.name).not.toBeNull();
                expect(created!.builtIn).toBe(true);
                expect(created!.authMethod).toBe('none');
                expect(created!.tokenBindingMethod).toBe('none');
                expect(created!.displayName).toBe(definition.displayName);
            }
        });

        // Regression (#3347): the declared `global openid` used to land in the
        // dead `scope` column only, leaving the client with no junction rows.
        // That junction is the sole source /authorize resolves scopes from.
        it('should bind the built-in scopes through the junction for every client', async () => {
            const realmId = randomUUID();
            await provisioner.ensureForRealm({ id: realmId });

            for (const definition of SYSTEM_CLIENT_DEFINITIONS) {
                const client = await repository.findOneBy({
                    name: definition.name,
                    realmId,
                });

                expect(await readScopeNames(client!.id)).toEqual(
                    [...definition.scopeNames].sort(),
                );

                const rows = await clientScopeRepository.findManyBy({ clientId: client!.id });
                expect(rows.every((row) => row.clientRealmId === realmId)).toBe(true);
                expect(rows.every((row) => row.scopeRealmId === null)).toBe(true);
            }
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
                [...SYSTEM_CLIENT_SCOPE_NAMES].sort(),
            );
        });

        it('should be idempotent across repeated runs', async () => {
            const realmId = randomUUID();

            await provisioner.ensureForRealm({ id: realmId });
            await provisioner.ensureForRealm({ id: realmId });

            const result = await repository.findMany(new Query({}));
            for (const definition of SYSTEM_CLIENT_DEFINITIONS) {
                const clients = result.data.filter(
                    (c) => c.name === definition.name && c.realmId === realmId,
                );

                expect(clients, definition.name).toHaveLength(1);
            }

            expect(clientScopeRepository.getAll()).toHaveLength(
                SYSTEM_CLIENT_DEFINITIONS.length * SYSTEM_CLIENT_SCOPE_NAMES.length,
            );
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
                [...SYSTEM_CLIENT_SCOPE_NAMES, 'custom'].sort(),
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

        it('should refresh redirectUri on an existing built-in client', async () => {
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

        // The MERGE writes only the keys buildSystemClientAttributes carries,
        // so everything else survives a boot. That is the documented way to
        // extend a system client (provisioning file or API); accessPolicyId
        // and displayName are deliberately kept out of the builder for
        // exactly this reason.
        it('should keep attributes it does not own', async () => {
            const realmId = randomUUID();
            const accessPolicyId = randomUUID();
            repository.seed([
                {
                    id: randomUUID(),
                    name: CLIENT_ADMIN_CONSOLE_NAME,
                    realmId,
                    builtIn: true,
                    authMethod: 'none',
                    tokenBindingMethod: 'none',
                    redirectUri: 'http://stale.example.com/**',
                    displayName: 'Operators Only',
                    description: 'the realm operator console',
                    baseUrl: 'https://app.example.com',
                    accessPolicyId,
                },
            ]);

            await provisioner.ensureForRealm({ id: realmId });

            const updated = await repository.findOneBy({
                name: CLIENT_ADMIN_CONSOLE_NAME,
                realmId,
            });

            expect(updated!.redirectUri).toBe(
                'http://localhost:3000/**,https://app.example.com/**',
            );
            expect(updated!.displayName).toBe('Operators Only');
            expect(updated!.description).toBe('the realm operator console');
            expect(updated!.baseUrl).toBe('https://app.example.com');
            expect(updated!.accessPolicyId).toBe(accessPolicyId);
        });

        // Every system client name is reserved, so the row belongs to the
        // system: a non-built-in one predates the reservation and must not
        // shadow the realm's system client.
        it('should take over a non-built-in client squatting a reserved name', async () => {
            const realmId = randomUUID();
            repository.seed([
                {
                    id: randomUUID(),
                    name: CLIENT_ADMIN_CONSOLE_NAME,
                    realmId,
                    builtIn: false,
                    authMethod: 'secret',
                    tokenBindingMethod: 'none',
                    secret: 'legacy-secret',
                    redirectUri: 'http://user-owned.example.com/**',
                },
            ]);

            await provisioner.ensureForRealm({ id: realmId });

            const existing = await repository.findOneBy({
                name: CLIENT_ADMIN_CONSOLE_NAME,
                realmId,
            });

            expect(existing!.builtIn).toBe(true);
            expect(existing!.authMethod).toBe('none');
            expect(existing!.redirectUri).toBe(
                'http://localhost:3000/**,https://app.example.com/**',
            );
            // the client is public now, so its secret can never authenticate
            // it again and must not stay at rest
            expect(existing!.secret).toBeNull();
            expect(await readScopeNames(existing!.id)).toEqual(
                [...SYSTEM_CLIENT_SCOPE_NAMES].sort(),
            );
        });
    });
});
