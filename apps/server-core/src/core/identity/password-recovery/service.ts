/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, NotFoundError } from '@ebec/http';
import { createValidationChain, createValidator } from '@validup/adapter-validator';
import { randomBytes } from 'node:crypto';
import { Container } from 'validup';
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
        if (!this.options.registration) {
            throw new BadRequestError('User registration is not enabled.');
        }

        if (!this.options.emailVerification) {
            throw new BadRequestError('Email verification is not enabled, but required to reset a password.');
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
            throw new NotFoundError();
        }

        const merged = this.repository.merge(entity, {
            reset_expires: new Date(Date.now() + (1000 * 60 * 30)).toISOString(),
            reset_hash: randomBytes(32).toString('hex'),
        });

        await this.repository.save(merged);

        await this.mailClient.send({
            to: entity.email,
            subject: 'Forgot Password - Reset code',
            html: `
            <p>Please use the code below to reset your account password.</p>
            <p>${merged.reset_hash}</p>
            `,
        });

        return {
            reset_expires: merged.reset_expires!,
        };
    }

    async resetPassword(data: Record<string, any>): Promise<PasswordResetResult> {
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
            throw new NotFoundError();
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

        return {
            reset_at: merged.reset_at!,
        };
    }

    private async runForgotPasswordValidator(data: Record<string, any>) {
        const validator = new Container<any>({});

        const oneOfContainer = new Container({
            oneOf: true,
        });

        oneOfContainer.mount('email', createValidator(() => {
            const chain = createValidationChain();
            return chain
                .exists()
                .notEmpty()
                .isEmail();
        }));

        oneOfContainer.mount(
            'name',
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .notEmpty()
                    .isString();
            }),
        );

        validator.mount(oneOfContainer);

        validator.mount(
            'realm_id',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain.exists()
                    .isUUID()
                    .optional({ values: 'null' });
            }),
        );

        return validator.run(data);
    }

    private async runResetPasswordValidator(data: Record<string, any>) {
        const validator = new Container<any>({});

        const oneOfContainer = new Container({
            oneOf: true,
        });
        oneOfContainer.mount(
            'email',
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .notEmpty()
                    .isEmail();
            }),
        );
        oneOfContainer.mount(
            'name',
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .notEmpty()
                    .isString();
            }),
        );

        validator.mount(oneOfContainer);

        validator.mount(
            'realm_id',
            { optional: true },
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .isUUID()
                    .optional({ values: 'null' });
            }),
        );

        validator.mount(
            'token',
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .notEmpty()
                    .isLength({ min: 3, max: 256 });
            }),
        );

        validator.mount(
            'password',
            createValidator(() => {
                const chain = createValidationChain();
                return chain
                    .exists()
                    .notEmpty()
                    .isLength({ min: 5, max: 512 });
            }),
        );

        return validator.run(data);
    }
}
