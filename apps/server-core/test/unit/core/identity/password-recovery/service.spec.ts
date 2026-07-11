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
import { ErrorCode } from '@authup/errors';
import { PasswordRecoveryService } from '../../../../../src/core/identity/password-recovery/service.ts';
import { MailTemplateRenderer } from '../../../../../src/core/mail/index.ts';
import { FakeRealmRepository } from '../../entities/realm/fake-repository.ts';
import { FakeUserRepository } from '../../entities/user/fake-repository.ts';
import { FakeMailClient } from '../../helpers/fake-mail-client.ts';
import { createFakeUser } from '../../../../utils/domains/index.ts';

describe('core/identity/password-recovery/service', () => {
    let repository: FakeUserRepository;
    let realmRepository: FakeRealmRepository;
    let mailClient: FakeMailClient;
    let mailTemplateRenderer: MailTemplateRenderer;

    beforeEach(() => {
        repository = new FakeUserRepository();
        realmRepository = new FakeRealmRepository();
        mailClient = new FakeMailClient();
        mailTemplateRenderer = new MailTemplateRenderer();
    });

    describe('forgotPassword', () => {
        it('should throw when password recovery is not enabled', async () => {
            const service = new PasswordRecoveryService({
                options: { passwordRecoveryEnabled: false },
                mailClient,
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            await expect(
                service.forgotPassword({ email: faker.internet.email().toLowerCase() }),
            ).rejects.toMatchObject({ code: ErrorCode.PASSWORD_RECOVERY_DISABLED });
        });

        it('should throw when email verification is not enabled', async () => {
            const service = new PasswordRecoveryService({
                options: {
                    passwordRecoveryEnabled: true,
                    emailVerificationEnabled: false, 
                },
                mailClient,
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            await expect(
                service.forgotPassword({ email: faker.internet.email().toLowerCase() }),
            ).rejects.toMatchObject({ code: ErrorCode.EMAIL_VERIFICATION_REQUIRED });
        });

        it('should throw NotFoundError when user does not exist', async () => {
            const service = new PasswordRecoveryService({
                options: {
                    passwordRecoveryEnabled: true,
                    emailVerificationEnabled: true, 
                },
                mailClient,
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            await expect(
                service.forgotPassword({ email: 'nonexistent@example.com' }),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });

        it('should set reset_hash and reset_expires and send email', async () => {
            const email = faker.internet.email().toLowerCase();
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
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            const result = await service.forgotPassword({ email });

            expect(result.reset_expires).toBeDefined();
            expect(mailClient.sent).toHaveLength(1);
            expect(mailClient.sent[0]).toMatchObject({ to: email });
            expect(mailClient.sent[0].subject).toContain('Reset');

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
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            const result = await service.forgotPassword({ name: 'forgot-user' });
            expect(result.reset_expires).toBeDefined();
        });

        it('should localize the reset mail and mention the expiry window', async () => {
            const email = faker.internet.email().toLowerCase();
            const masterRealm = realmRepository.getMasterRealm();
            repository.seed([createFakeUser({
                name: 'locale-user',
                email,
                realm_id: masterRealm.id,
            })]);

            const service = new PasswordRecoveryService({
                options: {
                    passwordRecoveryEnabled: true,
                    emailVerificationEnabled: true,
                },
                mailClient,
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            await service.forgotPassword({ email }, { locale: 'fr' });

            expect(mailClient.sent).toHaveLength(1);
            expect(mailClient.sent[0].subject).toEqual('Réinitialisez votre mot de passe');
            expect(mailClient.sent[0].text).toContain('30 minutes');
        });

        it('should set reset_expires to ~30 minutes from now', async () => {
            const email = faker.internet.email().toLowerCase();
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
                mailTemplateRenderer,
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
            const email = faker.internet.email().toLowerCase();
            const masterRealm = realmRepository.getMasterRealm();
            const entity = repository.seed(createFakeUser({
                name: 'mail-fail-user',
                email,
                realm_id: masterRealm.id,
            }));

            mailClient.failNext(new Error('SMTP error'));

            const service = new PasswordRecoveryService({
                options: {
                    passwordRecoveryEnabled: true,
                    emailVerificationEnabled: true, 
                },
                mailClient,
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            await expect(service.forgotPassword({ email })).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });

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
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            await expect(
                service.resetPassword({
                    email: faker.internet.email().toLowerCase(),
                    token: 'abc',
                    password: 'newpass123',
                }),
            ).rejects.toMatchObject({ code: ErrorCode.PASSWORD_RECOVERY_DISABLED });
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
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            await expect(
                service.resetPassword({
                    email: 'reset@example.com',
                    token: 'wrong-token',
                    password: 'newpass123',
                }),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
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
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            await expect(
                service.resetPassword({
                    email: 'expired@example.com',
                    token: 'expired-token',
                    password: 'newpass123',
                }),
            ).rejects.toMatchObject({ code: ErrorCode.RESET_TOKEN_EXPIRED });
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
                mailTemplateRenderer,
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

        it('should reject a new password below the default minimum length', async () => {
            const masterRealm = realmRepository.getMasterRealm();
            repository.seed([createFakeUser({
                name: 'short-pass-user',
                email: 'short-pass@example.com',
                reset_hash: 'short-pass-token',
                reset_expires: new Date(Date.now() + 60000).toISOString(),
                realm_id: masterRealm.id,
            })]);

            const service = new PasswordRecoveryService({
                options: {
                    passwordRecoveryEnabled: true,
                    emailVerificationEnabled: true,
                },
                mailClient,
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            await expect(
                service.resetPassword({
                    email: 'short-pass@example.com',
                    token: 'short-pass-token',
                    password: 'a'.repeat(9),
                }),
            ).rejects.toThrow(/password/i);
        });

        it('should honor a configured minimum password length', async () => {
            const masterRealm = realmRepository.getMasterRealm();
            repository.seed([createFakeUser({
                name: 'strict-pass-user',
                email: 'strict-pass@example.com',
                reset_hash: 'strict-pass-token',
                reset_expires: new Date(Date.now() + 60000).toISOString(),
                realm_id: masterRealm.id,
            })]);

            const service = new PasswordRecoveryService({
                options: {
                    passwordRecoveryEnabled: true,
                    emailVerificationEnabled: true,
                    passwordMinLength: 12,
                },
                mailClient,
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            await expect(
                service.resetPassword({
                    email: 'strict-pass@example.com',
                    token: 'strict-pass-token',
                    password: 'a'.repeat(11),
                }),
            ).rejects.toThrow(/password/i);

            const result = await service.resetPassword({
                email: 'strict-pass@example.com',
                token: 'strict-pass-token',
                password: 'a'.repeat(12),
            });
            expect(result.reset_at).toBeDefined();
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
                mailTemplateRenderer,
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
