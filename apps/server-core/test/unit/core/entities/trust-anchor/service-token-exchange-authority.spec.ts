/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PermissionError } from '@authup/access';
import { PermissionName } from '@authup/core-kit';
import { createAllowAllActor } from '@authup/server-test-kit';
import type { FakeActorContext, FakePermissionEvaluator } from '@authup/server-test-kit';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { TrustAnchorService } from '../../../../../src/core/entities/trust-anchor/service.ts';
import { FakeClientTokenExchangeCapabilityRepository } from '../client-token-exchange-capability/fake-repository.ts';
import { FakeTrustAnchorRepository } from './fake-repository.ts';

const CA_CERTIFICATE = readFileSync(
    new URL('../../../../data/certificates/certificate.pem', import.meta.url),
    'utf8',
);

const CAPABILITY_UPDATE = PermissionName.CLIENT_TOKEN_EXCHANGE_CAPABILITY_UPDATE;

function buildKeyAdmin(): FakeActorContext {
    const actor = createAllowAllActor();

    (actor.permissionEvaluator as FakePermissionEvaluator).setBehavior(({ ctx }) => {
        const names = Array.isArray(ctx.name) ? ctx.name : [ctx.name];

        if (names.includes(CAPABILITY_UPDATE)) {
            throw PermissionError.denied(CAPABILITY_UPDATE);
        }
    });

    return actor;
}

describe('core/entities/trust-anchor/service token exchange authority', () => {
    const realmId = randomUUID();

    let repository: FakeTrustAnchorRepository;
    let capabilityRepository: FakeClientTokenExchangeCapabilityRepository;
    let service: TrustAnchorService;

    const payload = () => ({
        name: `ca-${randomUUID().slice(0, 8)}`,
        certificate: CA_CERTIFICATE,
        realmId,
    });

    function attachCapability() {
        capabilityRepository.seed({
            clientId: randomUUID(),
            realmId,
            audience: 'storage',
            value: 'bucket',
            maxAge: 600,
            realmScope: 'own',
        });
    }

    beforeEach(() => {
        repository = new FakeTrustAnchorRepository();
        capabilityRepository = new FakeClientTokenExchangeCapabilityRepository();
        service = new TrustAnchorService({ repository, tokenExchangeCapabilityRepository: capabilityRepository });
    });

    it('should not let an echoed enabled undo a disable that landed in between', async () => {
        const anchor = repository.seed({ ...payload(), enabled: true });

        attachCapability();

        repository.beforeTransaction = () => {
            repository.beforeTransaction = undefined;
            repository.getAll()[0]!.enabled = false;
        };

        await expect(service.update(anchor.id, { enabled: true, name: 'renamed-anchor' }, buildKeyAdmin())).rejects.toThrow(PermissionError);

        expect(repository.getAll()[0]!.enabled).toBe(false);
    });

    it('should refuse a new anchor in a realm with a capability', async () => {
        attachCapability();

        await expect(service.create(payload(), buildKeyAdmin())).rejects.toThrow(PermissionError);
    });

    it('should accept a new anchor in a realm without a capability', async () => {
        await expect(service.create(payload(), buildKeyAdmin())).resolves.toBeDefined();
    });

    it('should refuse turning an anchor on and keep an echoed enabled editable', async () => {
        const disabled = repository.seed({ ...payload(), enabled: false });
        const enabled = repository.seed({ ...payload(), enabled: true });

        attachCapability();

        await expect(service.update(disabled.id, { enabled: true }, buildKeyAdmin())).rejects.toThrow(PermissionError);
        await expect(service.update(enabled.id, { enabled: true, name: 'renamed-anchor' }, buildKeyAdmin())).resolves.toMatchObject({ name: 'renamed-anchor' });
    });
});
