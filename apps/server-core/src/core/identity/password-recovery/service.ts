/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, EntityNotFoundError } from '@authup/errors';
import { PasswordRecoveryDisabledError } from './disabled.ts';
import { EmailVerificationRequiredError } from './email-verification-required.ts';
import { ResetTokenExpiredError } from './token-expired.ts';
import { createValidator } from '@validup/zod';
import { randomBytes } from 'node:crypto';
import { Container } from 'validup';
import { z } from 'zod';
import { UserCredentialsService } from '../../authentication/credential/entities/user/module.ts';
import type {
    IPasswordRecoveryService,
    PasswordForgotResult,
    PasswordRecoveryServiceContext,
    PasswordRecoveryServiceOptions,
    PasswordResetResult,
} from './types.ts';
import type { IMailClient } from '../../mail/types.ts';
import type { IRealmRepository, IUserRepository } from '../../entities/index.ts';

export class PasswordRecoveryService implements IPasswordRecoveryService {
    protected options: PasswordRecoveryServiceOptions;

    protected repository: IUserRepository;

    protected realmRepository: IRealmRepository;

    protected mailClient: IMailClient;

    constructor(ctx: PasswordRecoveryServiceContext) {
        this.options = ctx.options;
        this.repository = ctx.repository;
        this.realmRepository = ctx.realmRepository;
        this.mailClient = ctx.mailClient;
    }

    async forgotPassword(data: Record<string, any>): Promise<PasswordForgotResult> {
        if (!this.options.passwordRecoveryEnabled) {
            throw new PasswordRecoveryDisabledError();
        }

        if (!this.options.emailVerificationEnabled) {
            throw new EmailVerificationRequiredError('Email verification is not enabled, but required to reset a password.');
        }

        const validated = await this.runForgotPasswordValidator(data);

        const realm = await this.realmRepository.resolve(validated.realm_id, true);

        const where: Record<string, any> = {
            ...(validated.name ? { name: validated.name } : {}),
            ...(validated.email ? { email: validated.email } : {}),
            realm_id: realm.id,
        };

        const entity = await this.repository.findOneByWithEmail(where);

        if (!entity) {
            throw new EntityNotFoundError();
        }

        const merged = this.repository.merge(entity, {
            reset_expires: new Date(Date.now() + (1000 * 60 * 30)).toISOString(),
            reset_hash: randomBytes(32).toString('hex'),
        });

        await this.repository.save(merged);

        try {
            // realm_id MUST ride the link: resetPassword resolves the realm
            // from the request and filters the lookup by it, so a realm-less
            // link resolves to the master realm and never matches a
            // non-master user.
            const resetUrl = this.options.publicUrl ?
                `${this.options.publicUrl.replace(/\/+$/, '')}/password-reset` +
                `?token=${encodeURIComponent(merged.reset_hash!)}` +
                `&realm_id=${encodeURIComponent(entity.realm_id)}` :
                undefined;

            await this.mailClient.send({
                to: entity.email,
                subject: 'Forgot Password - Reset code',
                html: `
                <p>Please use the code below to reset your account password.</p>
                <p>${merged.reset_hash}</p>
                ${resetUrl ? `<p><a href="${resetUrl}">Reset password</a></p>` : ''}
                `,
            });
        } catch {
            this.repository.merge(merged, {
                reset_hash: null,
                reset_expires: null,
            });
            await this.repository.save(merged);

            throw new BadRequestError('Password recovery failed. Could not send reset email.');
        }

        return { reset_expires: merged.reset_expires! };
    }

    async resetPassword(data: Record<string, any>): Promise<PasswordResetResult> {
        if (!this.options.passwordRecoveryEnabled) {
            throw new PasswordRecoveryDisabledError();
        }

        const validated = await this.runResetPasswordValidator(data);

        await this.repository.validateJoinColumns(validated);

        const realm = await this.realmRepository.resolve(validated.realm_id, true);

        const where: Record<string, any> = {
            ...(validated.name ? { name: validated.name } : {}),
            ...(validated.email ? { email: validated.email } : {}),
            reset_hash: validated.token,
            realm_id: realm.id,
        };

        const entity = await this.repository.findOneBy(where);
        if (!entity) {
            throw new EntityNotFoundError();
        }

        if (!entity.reset_expires || new Date(entity.reset_expires) < new Date()) {
            throw new ResetTokenExpiredError();
        }

        const credentialsService = new UserCredentialsService();
        const hashedPassword = await credentialsService.protect(validated.password);

        const merged = this.repository.merge(entity, {
            reset_at: new Date().toISOString(),
            reset_hash: null,
            reset_expires: null,
            password: hashedPassword,
        });

        await this.repository.save(merged);

        return { reset_at: merged.reset_at! };
    }

    private async runForgotPasswordValidator(data: Record<string, any>) {
        const validator = new Container<any>({});

        const oneOfContainer = new Container({ oneOf: true });

        oneOfContainer.mount(
            'email',
            createValidator(
                z.string()
                    .trim()
                    .toLowerCase()
                    .email()
                    .regex(/^[^A-Z]+$/, { message: 'Email must be lowercase.' }),
            ),
        );

        oneOfContainer.mount(
            'name',
            createValidator(z.string().trim().toLowerCase().min(1)),
        );

        validator.mount(oneOfContainer);

        validator.mount(
            'realm_id',
            { optional: true },
            createValidator(z.uuid().nullable()),
        );

        return validator.run(data);
    }

    private async runResetPasswordValidator(data: Record<string, any>) {
        const validator = new Container<any>({});

        const oneOfContainer = new Container({ oneOf: true });
        oneOfContainer.mount(
            'email',
            createValidator(
                z.string()
                    .trim()
                    .toLowerCase()
                    .email()
                    .regex(/^[^A-Z]+$/, { message: 'Email must be lowercase.' }),
            ),
        );
        oneOfContainer.mount(
            'name',
            createValidator(z.string().trim().toLowerCase().min(1)),
        );

        validator.mount(oneOfContainer);

        validator.mount(
            'realm_id',
            { optional: true },
            createValidator(z.uuid().nullable()),
        );

        validator.mount(
            'token',
            createValidator(z.string().min(3).max(256)),
        );

        validator.mount(
            'password',
            createValidator(z.string().min(5).max(512)),
        );

        return validator.run(data);
    }
}
