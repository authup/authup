/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { UserValidator } from '@authup/core-kit';
import { createNanoID } from '@authup/kit';
import { BadRequestError, NotFoundError } from '@ebec/http';
import { randomBytes } from 'node:crypto';
import { Container } from 'validup';
import { UserCredentialsService } from '../../authentication/credential/entities/user/module.ts';
import type {
    IRegistrationService,
    RegistrationResult,
    RegistrationServiceContext,
    RegistrationServiceOptions,
} from './types.ts';
import type { IMailClient } from '../../mail/types.ts';
import type { IRealmRepository, IUserRepository } from '../../entities/index.ts';

export class RegistrationService implements IRegistrationService {
    protected options: RegistrationServiceOptions;

    protected mailClient: IMailClient;

    protected repository: IUserRepository;

    protected realmRepository: IRealmRepository;

    constructor(ctx: RegistrationServiceContext) {
        this.options = ctx.options;
        this.mailClient = ctx.mailClient;
        this.repository = ctx.repository;
        this.realmRepository = ctx.realmRepository;
    }

    async register(data: Record<string, any>): Promise<RegistrationResult> {
        if (!this.options.registrationEnabled) {
            throw new BadRequestError('User registration is not enabled.');
        }

        const validator = new Container({});
        validator.mount(new UserValidator({
            pathsToInclude: ['email', 'name', 'password', 'realm_id'],
        }));
        const validated = await validator.run(data, { group: 'create' });

        await this.repository.validateJoinColumns(validated);

        if (this.options.emailVerificationEnabled) {
            validated.active = false;
            validated.activate_hash = randomBytes(32).toString('hex');
        } else {
            validated.active = true;
        }

        const entity = this.repository.create(validated);

        const credentialsService = new UserCredentialsService();
        entity.password = entity.password || createNanoID(64);
        entity.password = await credentialsService.protect(entity.password);

        const realm = await this.realmRepository.resolve(entity.realm_id, true);
        entity.realm_id = realm.id;

        await this.repository.save(entity);

        if (this.options.emailVerificationEnabled) {
            try {
                await this.mailClient.send({
                    to: entity.email,
                    subject: 'Registration - Activation code',
                    html: `
                    <p>Please use the code below to activate your account and start using the site.</p>
                    <p>${entity.activate_hash}</p>
                    `,
                });
            } catch {
                await this.repository.remove(entity);
                throw new BadRequestError('Registration failed. Could not send activation email.');
            }
        }

        return {
            active: entity.active,
        };
    }

    async activate(data: { token: string }): Promise<void> {
        const entity = await this.repository.findOneBy({
            activate_hash: data.token,
        });

        if (!entity) {
            throw new NotFoundError();
        }

        const merged = this.repository.merge(entity, {
            active: true,
            activate_hash: null,
        });

        await this.repository.save(merged);
    }
}
