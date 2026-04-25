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
    vi,
} from 'vitest';
import { BadRequestError, NotFoundError } from '@ebec/http';
import type { User } from '@authup/core-kit';
import { PasswordRecoveryService } from '../../../../../src/core/identity/password-recovery/service.ts';
import type { IMailClient } from '../../../../../src/core/mail/types.ts';
import { FakeRealmRepository } from '../../helpers/fake-realm-repository.ts';
import type { IUserRepository } from '../../../../../src/core/entities/user/types.ts';
import { FakeEntityRepository } from '../../helpers/fake-repository.ts';
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

    async getBoundRoles(): Promise<any[]> {
        return [];
    }

    async getBoundPermissions(): Promise<any[]> {
        return [];
    }
}

function createMockMailClient(): IMailClient {
    return { send: vi.fn().mockResolvedValue(undefined) };
}

describe('core/identity/password-recovery/service', () => {
    let repository: FakeUserRepository;
    let realmRepository: FakeRealmRepository;
    let mailClient: IMailClient;

    beforeEach(() => {
        repository = new FakeUserRepository();
        realmRepository = new FakeRealmRepository();
        mailClient = createMockMailClient();
    });

    describe('forgotPassword', () => {
        it('should throw when password recovery is not enabled', async () => {
            const service = new PasswordRecoveryService({
                options: { passwordRecoveryEnabled: false },
                mailClient,
                repository,
                realmRepository,
            });

            await expect(
                service.forgotPassword({ email: faker.internet.email() }),
            ).rejects.toThrow(BadRequestError);
        });

        it('should throw when email verification is not enabled', async () => {
            const service = new PasswordRecoveryService({
                options: {
                    passwordRecoveryEnabled: true,
                    emailVerificationEnabled: false, 
                },
                mailClient,
                repository,
                realmRepository,
            });

            await expect(
                service.forgotPassword({ email: faker.internet.email() }),
            ).rejects.toThrow(BadRequestError);
        });

        it('should throw NotFoundError when user does not exist', async () => {
            const service = new PasswordRecoveryService({
                options: {
                    passwordRecoveryEnabled: true,
                    emailVerificationEnabled: true, 
                },
                mailClient,
                repository,
                realmRepository,
            });

            await expect(
                service.forgotPassword({ email: 'nonexistent@example.com' }),
            ).rejects.toThrow(NotFoundError);
        });

        it('should set reset_hash and reset_expires and send email', async () => {
            const email = faker.internet.email();
            const masterRealm = realmRepository.getMasterRealm();
            repository.seed([createFakeUser({
                name: 'test-user',
                email,
                realm_id: masterRealm.id,
            })]);

            const service = new PasswordRecoveryService({
                options: {
                    passwordRecoveryEnabled: true,
                    emailVerificationEnabled: true, 
                },
                mailClient,
                repository,
                realmRepository,
            });

            const result = await service.forgotPassword({ email });

            expect(result.reset_expires).toBeDefined();
            expect(mailClient.send).toHaveBeenCalledTimes(1);
            expect(mailClient.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: email,
                    subject: expect.stringContaining('Reset'),
                }),
            );

            const user = await repository.findOneBy({
                email,
                realm_id: masterRealm.id, 
            });
            expect(user!.reset_hash).toBeDefined();
            expect(user!.reset_hash).not.toBeNull();
            expect(user!.reset_expires).toBeDefined();
        });

        it('should accept name instead of email for lookup', async () => {
            const masterRealm = realmRepository.getMasterRealm();
            repository.seed([createFakeUser({
                name: 'forgot-user',
                realm_id: masterRealm.id,
            })]);

            const service = new PasswordRecoveryService({
                options: {
                    passwordRecoveryEnabled: true,
                    emailVerificationEnabled: true, 
                },
                mailClient,
                repository,
                realmRepository,
            });

            const result = await service.forgotPassword({ name: 'forgot-user' });
            expect(result.reset_expires).toBeDefined();
        });

        it('should set reset_expires to ~30 minutes from now', async () => {
            const email = faker.internet.email();
            const masterRealm = realmRepository.getMasterRealm();
            repository.seed([createFakeUser({
                name: 'timer-user',
                email,
                realm_id: masterRealm.id,
            })]);

            const service = new PasswordRecoveryService({
                options: {
                    passwordRecoveryEnabled: true,
                    emailVerificationEnabled: true, 
                },
                mailClient,
                repository,
                realmRepository,
            });

            const before = Date.now();
            const result = await service.forgotPassword({ email });
            const after = Date.now();

            const expires = new Date(result.reset_expires).getTime();
            const thirtyMinutes = 1000 * 60 * 30;
            expect(expires).toBeGreaterThanOrEqual(before + thirtyMinutes - 1000);
            expect(expires).toBeLessThanOrEqual(after + thirtyMinutes + 1000);
        });

        it('should rollback reset fields on mail failure', async () => {
            const email = faker.internet.email();
            const masterRealm = realmRepository.getMasterRealm();
            const entity = repository.seed(createFakeUser({
                name: 'mail-fail-user',
                email,
                realm_id: masterRealm.id,
            }));

            vi.mocked(mailClient.send).mockRejectedValue(new Error('SMTP error'));

            const service = new PasswordRecoveryService({
                options: {
                    passwordRecoveryEnabled: true,
                    emailVerificationEnabled: true, 
                },
                mailClient,
                repository,
                realmRepository,
            });

            await expect(service.forgotPassword({ email })).rejects.toThrow(BadRequestError);

            const user = await repository.findOneById(entity.id);
            expect(user!.reset_hash).toBeNull();
            expect(user!.reset_expires).toBeNull();
        });
    });

    describe('resetPassword', () => {
        it('should throw when password recovery is not enabled', async () => {
            const service = new PasswordRecoveryService({
                options: { passwordRecoveryEnabled: false },
                mailClient,
                repository,
                realmRepository,
            });

            await expect(
                service.resetPassword({
                    email: faker.internet.email(),
                    token: 'abc',
                    password: 'newpass123',
                }),
            ).rejects.toThrow(BadRequestError);
        });

        it('should throw NotFoundError when token does not match', async () => {
            const masterRealm = realmRepository.getMasterRealm();
            repository.seed([createFakeUser({
                name: 'reset-user',
                email: 'reset@example.com',
                reset_hash: 'valid-token',
                reset_expires: new Date(Date.now() + 60000).toISOString(),
                realm_id: masterRealm.id,
            })]);

            const service = new PasswordRecoveryService({
                options: {
                    passwordRecoveryEnabled: true,
                    emailVerificationEnabled: true, 
                },
                mailClient,
                repository,
                realmRepository,
            });

            await expect(
                service.resetPassword({
                    email: 'reset@example.com',
                    token: 'wrong-token',
                    password: 'newpass123',
                }),
            ).rejects.toThrow(NotFoundError);
        });

        it('should throw BadRequestError when token has expired', async () => {
            const masterRealm = realmRepository.getMasterRealm();
            repository.seed([createFakeUser({
                name: 'expired-user',
                email: 'expired@example.com',
                reset_hash: 'expired-token',
                reset_expires: new Date(Date.now() - 60000).toISOString(),
                realm_id: masterRealm.id,
            })]);

            const service = new PasswordRecoveryService({
                options: {
                    passwordRecoveryEnabled: true,
                    emailVerificationEnabled: true, 
                },
                mailClient,
                repository,
                realmRepository,
            });

            await expect(
                service.resetPassword({
                    email: 'expired@example.com',
                    token: 'expired-token',
                    password: 'newpass123',
                }),
            ).rejects.toThrow(BadRequestError);
        });

        it('should reset password, clear reset fields, and hash new password', async () => {
            const masterRealm = realmRepository.getMasterRealm();
            const entity = repository.seed(createFakeUser({
                name: 'valid-user',
                email: 'valid@example.com',
                reset_hash: 'valid-token',
                reset_expires: new Date(Date.now() + 60000).toISOString(),
                realm_id: masterRealm.id,
            }));

            const service = new PasswordRecoveryService({
                options: {
                    passwordRecoveryEnabled: true,
                    emailVerificationEnabled: true, 
                },
                mailClient,
                repository,
                realmRepository,
            });

            const result = await service.resetPassword({
                email: 'valid@example.com',
                token: 'valid-token',
                password: 'newpass123',
            });

            expect(result.reset_at).toBeDefined();

            const user = await repository.findOneById(entity.id);
            expect(user!.reset_hash).toBeNull();
            expect(user!.reset_expires).toBeNull();
            expect(user!.password).toMatch(/^\$2[aby]\$/);
            expect(user!.password).not.toBe('newpass123');
        });

        it('should reset password by name instead of email', async () => {
            const masterRealm = realmRepository.getMasterRealm();
            const entity = repository.seed(createFakeUser({
                name: 'name-reset-user',
                reset_hash: 'name-token',
                reset_expires: new Date(Date.now() + 60000).toISOString(),
                realm_id: masterRealm.id,
            }));

            const service = new PasswordRecoveryService({
                options: {
                    passwordRecoveryEnabled: true,
                    emailVerificationEnabled: true, 
                },
                mailClient,
                repository,
                realmRepository,
            });

            const result = await service.resetPassword({
                name: 'name-reset-user',
                token: 'name-token',
                password: 'newpass456',
            });

            expect(result.reset_at).toBeDefined();

            const user = await repository.findOneById(entity.id);
            expect(user!.reset_hash).toBeNull();
        });
    });
});
