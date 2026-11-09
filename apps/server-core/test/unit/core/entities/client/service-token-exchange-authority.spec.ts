/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { PermissionError } from '@authup/access';
import type { Client } from '@authup/core-kit';
import { IdentityType, PermissionName } from '@authup/core-kit';
import { createAllowAllActor } from '@authup/server-test-kit';
import type { FakeActorContext, FakePermissionEvaluator } from '@authup/server-test-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { ClientService } from '../../../../../src/core/entities/client/service.ts';
import { createFakeClient } from '../../../../utils/domains/index.ts';
import { FakeClientTokenExchangeCapabilityRepository } from '../client-token-exchange-capability/fake-repository.ts';
import { FakeRealmRepository } from '../realm/fake-repository.ts';
import { FakeClientRepository } from './fake-repository.ts';

const CAPABILITY_UPDATE = PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_UPDATE;

/**
 * Allowed everything but the capability authority, which is what the built-in
 * realm_admin holds.
 */
function buildClientAdmin(): FakeActorContext {
    const actor = createAllowAllActor();

    (actor.permissionEvaluator as FakePermissionEvaluator).setBehavior(({ ctx }) => {
        const names = Array.isArray(ctx.name) ? ctx.name : [ctx.name];

        if (names.includes(CAPABILITY_UPDATE)) {
            throw PermissionError.denied(CAPABILITY_UPDATE);
        }
    });

    return actor;
}

describe('core/entities/client/service token exchange authority', () => {
    const realmId = randomUUID();

    let repository: FakeClientRepository;
    let capabilityRepository: FakeClientTokenExchangeCapabilityRepository;
    let service: ClientService;
    let client: Client;

    function attachCapability() {
        capabilityRepository.seed({
            clientId: client.id,
            realmId,
            audience: 'storage',
            value: 'bucket',
            maxAge: 600,
            realmScope: 'own',
        });
    }

    beforeEach(() => {
        repository = new FakeClientRepository();
        capabilityRepository = new FakeClientTokenExchangeCapabilityRepository();
        service = new ClientService({
            repository,
            realmRepository: new FakeRealmRepository(),
            tokenExchangeCapabilityRepository: capabilityRepository,
        });
        client = repository.seed(createFakeClient({
            realmId,
            authMethod: 'secret',
            secret: 'stored-secret',
            secretHashed: false,
            secretEncrypted: false,
            grantTypes: 'client_credentials',
        }));
    });

    it('should refuse a secret rotation on a client holding a capability', async () => {
        attachCapability();

        await expect(service.rotateSecret(client.id, { secret: 'attacker-chosen-secret' }, buildClientAdmin()))
            .rejects.toThrow(PermissionError);

        expect(repository.getAll()[0]!.secret).toEqual('stored-secret');
    });

    it.each([
        ['secret', { secret: 'attacker-chosen-secret' }],
        ['grantTypes', { grantTypes: 'urn:ietf:params:oauth:grant-type:token-exchange' }],
        ['authMethod', { authMethod: 'tls' }],
        ['tokenBindingMethod', { tokenBindingMethod: 'tls' }],
    ])('should refuse an update of %s on a client holding a capability', async (_key, data) => {
        attachCapability();

        await expect(service.update(client.id, data, buildClientAdmin())).rejects.toThrow(PermissionError);
    });

    it('should keep the other fields and echoed values editable', async () => {
        attachCapability();

        const updated = await service.update(client.id, {
            description: 'edited',
            grantTypes: 'client_credentials',
        }, buildClientAdmin());

        expect(updated.description).toEqual('edited');
    });

    it('should let a client without a capability be rotated and reconfigured', async () => {
        await expect(service.rotateSecret(client.id, { secret: 'a-new-secret-value' }, buildClientAdmin())).resolves.toBeDefined();
        await expect(service.update(client.id, { grantTypes: 'password' }, buildClientAdmin())).resolves.toBeDefined();
    });

    it('should let the holder of the capability authority rotate', async () => {
        attachCapability();

        await expect(service.rotateSecret(client.id, { secret: 'a-new-secret-value' }, createAllowAllActor())).resolves.toBeDefined();
    });

    describe('a client that also holds client_update', () => {
        function buildOwnActor(): FakeActorContext {
            const actor = buildClientAdmin();

            actor.identity = { type: IdentityType.CLIENT, data: client } as FakeActorContext['identity'];

            return actor;
        }

        it('should keep rotating its own secret', async () => {
            attachCapability();

            await expect(service.rotateSecret(client.id, { secret: 'a-new-secret-value' }, buildOwnActor())).resolves.toBeDefined();
        });

        it('should keep replacing its own secret through an update', async () => {
            attachCapability();

            await expect(service.update(client.id, { secret: 'a-new-secret-value' }, buildOwnActor())).resolves.toBeDefined();
        });

        it('should not change its storage mode or its grants', async () => {
            attachCapability();

            await expect(service.rotateSecret(client.id, { secret: 'a-new-secret-value', mode: 'hashed' }, buildOwnActor()))
                .rejects.toThrow(PermissionError);
            await expect(service.update(client.id, { grantTypes: 'password' }, buildOwnActor())).rejects.toThrow(PermissionError);
        });
    });

    it('should let a client rotate its own secret', async () => {
        attachCapability();

        const actor : FakeActorContext = createAllowAllActor();

        actor.identity = { type: IdentityType.CLIENT, data: client } as FakeActorContext['identity'];

        (actor.permissionEvaluator as FakePermissionEvaluator).setBehavior(({ ctx }) => {
            const names = Array.isArray(ctx.name) ? ctx.name : [ctx.name];

            if (names.includes(PermissionName.CLIENT_UPDATE) || names.includes(CAPABILITY_UPDATE)) {
                throw PermissionError.denied(names[0] as string);
            }
        });

        await expect(service.rotateSecret(client.id, { secret: 'a-new-secret-value' }, actor)).resolves.toBeDefined();
    });
});
