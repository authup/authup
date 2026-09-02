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
import { RegistrationService } from '../../../../../src/core/identity/registration/service.ts';
import { MailTemplateRenderer } from '../../../../../src/core/mail/index.ts';
import { FakeRealmRepository } from '../../entities/realm/fake-repository.ts';
import { FakeUserRepository } from '../../entities/user/fake-repository.ts';
import { FakeMailClient } from '../../helpers/fake-mail-client.ts';
import { createFakeUser } from '../../../../utils/domains/index.ts';

function createValidRegistrationData() {
    return {
        name: faker.internet.username().toLowerCase(),
        email: faker.internet.email().toLowerCase(),
        password: faker.string.alphanumeric({ length: 16 }),
    };
}

describe('core/identity/registration/service', () => {
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

    describe('register', () => {
        it('should throw when registration is not enabled', async () => {
            const service = new RegistrationService({
                options: { registrationEnabled: false },
                mailClient,
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            await expect(
                service.register(createValidRegistrationData()),
            ).rejects.toMatchObject({ code: ErrorCode.REGISTRATION_DISABLED });
        });

        it('should create an active user when email verification is disabled', async () => {
            const service = new RegistrationService({
                options: {
                    registrationEnabled: true,
                    emailVerificationEnabled: false, 
                },
                mailClient,
                mailTemplateRenderer,
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
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            const data = createValidRegistrationData();
            const result = await service.register(data);

            expect(result.active).toBe(false);

            const saved = await repository.findOneByName(data.name);
            expect(saved).not.toBeNull();
            expect(saved!.activateHash).toBeDefined();
            expect(saved!.activateHash).not.toBeNull();

            expect(mailClient.sent).toHaveLength(1);
            expect(mailClient.sent[0]).toMatchObject({ to: data.email });
            expect(mailClient.sent[0].subject).toContain('Activate');
        });

        it('should localize the activation mail from the workflow context', async () => {
            const service = new RegistrationService({
                options: {
                    registrationEnabled: true,
                    emailVerificationEnabled: true,
                },
                mailClient,
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            await service.register(createValidRegistrationData(), { locale: 'de-DE' });

            expect(mailClient.sent).toHaveLength(1);
            expect(mailClient.sent[0].subject).toEqual('Konto aktivieren');
        });

        it('should hash the password before saving', async () => {
            const service = new RegistrationService({
                options: { registrationEnabled: true },
                mailClient,
                mailTemplateRenderer,
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
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            const data = {
                name: faker.internet.username().toLowerCase(),
                email: faker.internet.email().toLowerCase(),
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
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            const data = createValidRegistrationData();
            await service.register(data);

            const saved = await repository.findOneByName(data.name);
            expect(saved).not.toBeNull();
            expect(saved!.email).toBe(data.email);
        });

        it('should resolve realmId to master realm when not provided', async () => {
            const service = new RegistrationService({
                options: { registrationEnabled: true },
                mailClient,
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            await service.register(createValidRegistrationData());

            const masterRealm = realmRepository.getMasterRealm();
            const users = await repository.findManyBy({ realmId: masterRealm.id });
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
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            const data = createValidRegistrationData();

            await expect(service.register(data)).rejects.toMatchObject({ code: ErrorCode.BAD_REQUEST });

            const saved = await repository.findOneByName(data.name);
            expect(saved).toBeNull();
        });

        it('should reject invalid email', async () => {
            const service = new RegistrationService({
                options: { registrationEnabled: true },
                mailClient,
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            await expect(
                service.register({
                    name: faker.internet.username().toLowerCase(),
                    email: 'not-an-email',
                    password: 'securepass123',
                }),
            ).rejects.toThrow(/email/i);
        });

        it('should reject a password below the default minimum length', async () => {
            const service = new RegistrationService({
                options: { registrationEnabled: true },
                mailClient,
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            await expect(
                service.register({
                    name: faker.internet.username().toLowerCase(),
                    email: faker.internet.email().toLowerCase(),
                    password: 'a'.repeat(9),
                }),
            ).rejects.toThrow(/password/i);
        });

        it('should honor a configured minimum password length', async () => {
            const service = new RegistrationService({
                options: {
                    registrationEnabled: true,
                    passwordMinLength: 12,
                },
                mailClient,
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            await expect(
                service.register({
                    name: faker.internet.username().toLowerCase(),
                    email: faker.internet.email().toLowerCase(),
                    password: 'a'.repeat(11),
                }),
            ).rejects.toThrow(/password/i);

            const result = await service.register({
                name: faker.internet.username().toLowerCase(),
                email: faker.internet.email().toLowerCase(),
                password: 'a'.repeat(12),
            });
            expect(result.active).toBe(true);
        });
    });

    describe('activate', () => {
        it('should activate a user by token', async () => {
            const activateHash = 'test-token-123';
            const entity = repository.seed(createFakeUser({
                name: 'inactive-user',
                active: false,
                activateHash,
            }));

            const service = new RegistrationService({
                options: {
                    registrationEnabled: true,
                    emailVerificationEnabled: true, 
                },
                mailClient,
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            await service.activate({ token: activateHash });

            const user = await repository.findOneById(entity.id);
            expect(user!.active).toBe(true);
            expect(user!.activateHash).toBeNull();
            // Following the mailed code is the only proof of address control
            // authup obtains, so it is the only place the claim is stamped.
            expect(user!.emailVerified).toBe(true);
        });

        it('should throw NotFoundError when token is invalid', async () => {
            const service = new RegistrationService({
                options: {
                    registrationEnabled: true,
                    emailVerificationEnabled: true, 
                },
                mailClient,
                mailTemplateRenderer,
                repository,
                realmRepository,
            });

            await expect(
                service.activate({ token: 'nonexistent-token' }),
            ).rejects.toMatchObject({ code: ErrorCode.ENTITY_NOT_FOUND });
        });
    });
});
