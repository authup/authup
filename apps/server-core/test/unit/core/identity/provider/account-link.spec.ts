/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import type { IdentityProvider } from '@authup/core-kit';
import { ValidationError, isValidationError } from '@authup/errors';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import type { IIdentityProviderMapper, IdentityProviderIdentity } from '../../../../../src/core/index.ts';
import { IdentityProviderAccountManager } from '../../../../../src/core/identity/provider/account/module.ts';
import { IdentityProviderAccountAlreadyLinkedError } from '../../../../../src/core/identity/provider/account/error.ts';
import { FakeIdentityProviderAccountRepository } from '../../entities/identity-provider-account/fake-repository.ts';
import { FakeUserIdentityRepository } from '../../entities/identity-provider-account/fake-user-repository.ts';

const realmId = randomUUID();
const providerId = randomUUID();
const userId = randomUUID();
const otherUserId = randomUUID();

describe('IdentityProviderAccountManager.link', () => {
    let repository: FakeIdentityProviderAccountRepository;
    let userRepository: FakeUserIdentityRepository;
    let manager: IdentityProviderAccountManager;
    let mapperExecute: ReturnType<typeof vi.fn>;

    const buildIdentity = (overrides: Partial<IdentityProviderIdentity> = {}): IdentityProviderIdentity => ({
        id: 'external-user-1',
        attributeCandidates: {
            name: ['External Name'],
            email: ['linked@example.com'],
        },
        data: {},
        provider: {
            id: providerId,
            realmId,
        } as IdentityProvider,
        ...overrides,
    });

    beforeEach(() => {
        repository = new FakeIdentityProviderAccountRepository();
        userRepository = new FakeUserIdentityRepository();
        mapperExecute = vi.fn(async () => []);
        const mapper = { execute: mapperExecute } as unknown as IIdentityProviderMapper;

        manager = new IdentityProviderAccountManager({
            repository,
            userRepository,
            attributeMapper: mapper,
            permissionMapper: mapper,
            roleMapper: mapper,
        });
    });

    it('links a fresh external identity to the user', async () => {
        userRepository.seed({ id: userId, realmId });

        const account = await manager.link(buildIdentity(), userId);

        expect(account.userId).toEqual(userId);
        expect(account.userRealmId).toEqual(realmId);
        expect(account.providerId).toEqual(providerId);
        expect(account.providerUserId).toEqual('external-user-1');
        expect(account.providerUserName).toEqual('External Name');
        expect(account.providerUserEmail).toEqual('linked@example.com');
        expect(repository.rows()).toHaveLength(1);
    });

    it('is idempotent for the same user', async () => {
        userRepository.seed({ id: userId, realmId });

        const first = await manager.link(buildIdentity(), userId);
        const second = await manager.link(buildIdentity({ attributeCandidates: { name: ['Renamed'], email: ['linked@example.com'] } }), userId);

        expect(second.id).toEqual(first.id);
        expect(second.providerUserName).toEqual('Renamed');
        expect(repository.rows()).toHaveLength(1);
    });

    it('rejects an identity linked to another user', async () => {
        userRepository.seed({ id: userId, realmId });
        userRepository.seed({ id: otherUserId, realmId });

        await manager.link(buildIdentity(), otherUserId);

        await expect(manager.link(buildIdentity(), userId))
            .rejects.toBeInstanceOf(IdentityProviderAccountAlreadyLinkedError);
        expect(repository.rows()).toHaveLength(1);
        expect(repository.rows()[0].userId).toEqual(otherUserId);
    });

    it('rejects a realm mismatch', async () => {
        userRepository.seed({ id: userId, realmId: randomUUID() });

        await expect(manager.link(buildIdentity(), userId))
            .rejects.toBeInstanceOf(ValidationError);
        expect(repository.rows()).toHaveLength(0);
    });

    it('rejects an unknown user', async () => {
        await expect(manager.link(buildIdentity(), userId))
            .rejects.toSatisfy((e) => isValidationError(e));
        expect(repository.rows()).toHaveLength(0);
    });

    it('never invokes the mappers', async () => {
        userRepository.seed({ id: userId, realmId });

        await manager.link(buildIdentity(), userId);

        expect(mapperExecute).not.toHaveBeenCalled();
    });

    it('falls back to the external id when no name candidate fits', async () => {
        userRepository.seed({ id: userId, realmId });

        const account = await manager.link(buildIdentity({ attributeCandidates: { name: [42], email: [] } }), userId);

        expect(account.providerUserName).toEqual('external-user-1');
        expect(account.providerUserEmail).toBeUndefined();
    });
});
