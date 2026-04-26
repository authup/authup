/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { faker } from '@faker-js/faker';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import { BadRequestError, NotFoundError } from '@ebec/http';
import type { Role, User } from '@authup/core-kit';
import type { PermissionPolicyBinding } from '@authup/access';
import { RegistrationService } from '../../../../../src/core/identity/registration/service.ts';
import { FakeRealmRepository } from '../../helpers/fake-realm-repository.ts';
import type { IUserRepository } from '../../../../../src/core/entities/user/types.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
import { FakeMailClient } from '../../helpers/fake-mail-client.ts';
import { createFakeUser } from '../../../../utils/domains/index.ts';

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

    async getBoundRoles(_entity: string | User): Promise<Role[]> {
        return [];
    }

    async getBoundPermissions(_entity: string | User): Promise<PermissionPolicyBinding[]> {
        return [];
    }
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
    let mailClient: FakeMailClient;

    beforeEach(() => {
        repository = new FakeUserRepository();
        realmRepository = new FakeRealmRepository();
        mailClient = new FakeMailClient();
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
            ).rejects.toThrow(BadRequestError);
        });

        it('should create an active user when email verification is disabled', async () => {
            const service = new RegistrationService({
                options: {
                    registrationEnabled: true,
                    emailVerificationEnabled: false, 
                },
                mailClient,
                repository,
                realmRepository,
            });

            const result = await service.register(createValidRegistrationData());

            expect(result.active).toBe(true);
            expect(mailClient.sent).toHaveLength(0);
        });

        it('should create an inactive user and send email when email verification is enabled', async () => {
            const service = new RegistrationService({
                options: {
                    registrationEnabled: true,
                    emailVerificationEnabled: true, 
                },
                mailClient,
                repository,
                realmRepository,
            });

            const data = createValidRegistrationData();
            const result = await service.register(data);

            expect(result.active).toBe(false);

            const saved = await repository.findOneByName(data.name);
            expect(saved).not.toBeNull();
            expect(saved!.activate_hash).toBeDefined();
            expect(saved!.activate_hash).not.toBeNull();

            expect(mailClient.sent).toHaveLength(1);
            expect(mailClient.sent[0]).toMatchObject({ to: data.email });
            expect(mailClient.sent[0].subject).toContain('Activation');
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

        it('should auto-generate password when none provided', async () => {
            const service = new RegistrationService({
                options: { registrationEnabled: true },
                mailClient,
                repository,
                realmRepository,
            });

            const data = {
                name: faker.internet.username(),
                email: faker.internet.email(),
            };
            await service.register(data);

            const saved = await repository.findOneByName(data.name);
            expect(saved).not.toBeNull();
            expect(saved!.password).toBeDefined();
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
            mailClient.failNext(new Error('SMTP error'));

            const service = new RegistrationService({
                options: {
                    registrationEnabled: true,
                    emailVerificationEnabled: true, 
                },
                mailClient,
                repository,
                realmRepository,
            });

            const data = createValidRegistrationData();

            await expect(service.register(data)).rejects.toThrow(BadRequestError);

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
                service.register({
                    name: faker.internet.username(),
                    email: 'not-an-email',
                    password: 'securepass123', 
                }),
            ).rejects.toThrow(/email/i);
        });
    });

    describe('activate', () => {
        it('should activate a user by token', async () => {
            const activateHash = 'test-token-123';
            const entity = repository.seed(createFakeUser({
                name: 'inactive-user',
                active: false,
                activate_hash: activateHash,
            }));

            const service = new RegistrationService({
                options: {
                    registrationEnabled: true,
                    emailVerificationEnabled: true, 
                },
                mailClient,
                repository,
                realmRepository,
            });

            await service.activate({ token: activateHash });

            const user = await repository.findOneById(entity.id);
            expect(user!.active).toBe(true);
            expect(user!.activate_hash).toBeNull();
        });

        it('should throw NotFoundError when token is invalid', async () => {
            const service = new RegistrationService({
                options: {
                    registrationEnabled: true,
                    emailVerificationEnabled: true, 
                },
                mailClient,
                repository,
                realmRepository,
            });

            await expect(
                service.activate({ token: 'nonexistent-token' }),
            ).rejects.toThrow(NotFoundError);
        });
    });
});
