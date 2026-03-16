/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { faker } from '@faker-js/faker';
import {
    beforeEach, describe, expect, it, vi,
} from 'vitest';
import { BadRequestError, NotFoundError } from '@ebec/http';
import type { User } from '@authup/core-kit';
import { RegistrationService } from '../../../../../src/core/identity/registration/service.ts';
import type { IMailClient } from '../../../../../src/core/mail/types.ts';
import { FakeRealmRepository } from '../../helpers/fake-realm-repository.ts';
import type { IUserRepository } from '../../../../../src/core/entities/user/types.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';

class FakeUserRepository extends FakeEntityRepository<User> implements IUserRepository {
    async checkUniqueness(): Promise<void> {
        // no-op
    }

    async findOne(id: string): Promise<User | null> {
        return this.findOneByIdOrName(id);
    }

    async findOneByWithEmail(where: Record<string, any>): Promise<User | null> {
        return this.findOneBy(where);
    }
}

function createMockMailClient(): IMailClient {
    return {
        send: vi.fn().mockResolvedValue(undefined),
    };
}

function createValidRegistrationData() {
    return {
        name: faker.internet.username(),
        email: faker.internet.email(),
        password: faker.string.alphanumeric({ length: 16 }),
    };
}

describe('core/identity/registration/service', () => {
    let repository: FakeUserRepository;
    let realmRepository: FakeRealmRepository;
    let mailClient: IMailClient;

    beforeEach(() => {
        repository = new FakeUserRepository();
        realmRepository = new FakeRealmRepository();
        mailClient = createMockMailClient();
    });

    describe('register', () => {
        it('should throw when registration is not enabled', async () => {
            const service = new RegistrationService({
                options: { registrationEnabled: false },
                mailClient,
                repository,
                realmRepository,
            });

            await expect(
                service.register(createValidRegistrationData()),
            ).rejects.toThrowError(BadRequestError);
        });

        it('should create an active user when email verification is disabled', async () => {
            const service = new RegistrationService({
                options: { registrationEnabled: true, emailVerificationEnabled: false },
                mailClient,
                repository,
                realmRepository,
            });

            const result = await service.register(createValidRegistrationData());

            expect(result.active).toBe(true);
            expect(mailClient.send).not.toHaveBeenCalled();
        });

        it('should create an inactive user and send email when email verification is enabled', async () => {
            const service = new RegistrationService({
                options: { registrationEnabled: true, emailVerificationEnabled: true },
                mailClient,
                repository,
                realmRepository,
            });

            const data = createValidRegistrationData();
            const result = await service.register(data);

            expect(result.active).toBe(false);
            expect(mailClient.send).toHaveBeenCalledTimes(1);
            expect(mailClient.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: data.email,
                    subject: expect.stringContaining('Activation'),
                }),
            );
        });

        it('should hash the password before saving', async () => {
            const service = new RegistrationService({
                options: { registrationEnabled: true },
                mailClient,
                repository,
                realmRepository,
            });

            const data = createValidRegistrationData();
            await service.register(data);

            const saved = await repository.findOneByName(data.name);
            expect(saved).not.toBeNull();
            expect(saved!.password).not.toBe(data.password);
            expect(saved!.password).toMatch(/^\$2[aby]\$/);
        });

        it('should persist the user in the repository', async () => {
            const service = new RegistrationService({
                options: { registrationEnabled: true },
                mailClient,
                repository,
                realmRepository,
            });

            const data = createValidRegistrationData();
            await service.register(data);

            const saved = await repository.findOneByName(data.name);
            expect(saved).not.toBeNull();
            expect(saved!.email).toBe(data.email);
        });

        it('should resolve realm_id to master realm when not provided', async () => {
            const service = new RegistrationService({
                options: { registrationEnabled: true },
                mailClient,
                repository,
                realmRepository,
            });

            await service.register(createValidRegistrationData());

            const masterRealm = realmRepository.getMasterRealm();
            const users = await repository.findManyBy({ realm_id: masterRealm.id });
            expect(users).toHaveLength(1);
        });

        it('should rollback user on mail failure', async () => {
            vi.mocked(mailClient.send).mockRejectedValue(new Error('SMTP error'));

            const service = new RegistrationService({
                options: { registrationEnabled: true, emailVerificationEnabled: true },
                mailClient,
                repository,
                realmRepository,
            });

            const data = createValidRegistrationData();

            await expect(service.register(data)).rejects.toThrowError(BadRequestError);

            const saved = await repository.findOneByName(data.name);
            expect(saved).toBeNull();
        });

        it('should reject invalid email', async () => {
            const service = new RegistrationService({
                options: { registrationEnabled: true },
                mailClient,
                repository,
                realmRepository,
            });

            await expect(
                service.register({ name: faker.internet.username(), email: 'not-an-email', password: 'securepass123' }),
            ).rejects.toThrowError();
        });
    });

    describe('activate', () => {
        it('should activate a user by token', async () => {
            const activateHash = 'test-token-123';
            repository.seed([{
                id: '1',
                name: 'inactive-user',
                active: false,
                activate_hash: activateHash,
            } as unknown as User]);

            const service = new RegistrationService({
                options: { registrationEnabled: true, emailVerificationEnabled: true },
                mailClient,
                repository,
                realmRepository,
            });

            await service.activate({ token: activateHash });

            const user = await repository.findOneById('1');
            expect(user!.active).toBe(true);
            expect(user!.activate_hash).toBeNull();
        });

        it('should throw NotFoundError when token is invalid', async () => {
            const service = new RegistrationService({
                options: { registrationEnabled: true, emailVerificationEnabled: true },
                mailClient,
                repository,
                realmRepository,
            });

            await expect(
                service.activate({ token: 'nonexistent-token' }),
            ).rejects.toThrowError(NotFoundError);
        });
    });
});
