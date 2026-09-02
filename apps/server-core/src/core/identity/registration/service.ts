/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    EventName,
    EventRefType,
    EventScope,
    IdentityType,
    UserValidator,
} from '@authup/core-kit';
import { createNanoID } from '@authup/kit';
import { EntityNotFoundError, ValidationError } from '@authup/errors';
import { RegistrationDisabledError } from './error.ts';
import { randomBytes } from 'node:crypto';
import { Container } from 'validup';
import { UserCredentialsService } from '../../authentication/credential/entities/user/module.ts';
import type {
    IRegistrationService,
    RegistrationResult,
    RegistrationServiceContext,
    RegistrationServiceOptions,
} from './types.ts';
import type { IMailClient, IMailTemplateRenderer } from '../../mail/types.ts';
import { MailTemplateName } from '../../mail/index.ts';
import type { IEventService, IRealmRepository, IUserRepository } from '../../entities/index.ts';
import type { IdentityWorkflowContext } from '../types.ts';

export class RegistrationService implements IRegistrationService {
    protected options: RegistrationServiceOptions;

    protected mailClient: IMailClient;

    protected mailTemplateRenderer: IMailTemplateRenderer;

    protected repository: IUserRepository;

    protected realmRepository: IRealmRepository;

    protected eventService?: IEventService;

    constructor(ctx: RegistrationServiceContext) {
        this.options = ctx.options;
        this.mailClient = ctx.mailClient;
        this.mailTemplateRenderer = ctx.mailTemplateRenderer;
        this.repository = ctx.repository;
        this.realmRepository = ctx.realmRepository;
        this.eventService = ctx.eventService;
    }

    async register(data: Record<string, any>, context?: IdentityWorkflowContext): Promise<RegistrationResult> {
        if (!this.options.registrationEnabled) {
            throw new RegistrationDisabledError();
        }

        const validator = new Container({});
        validator.mount(new UserValidator({
            pathsToInclude: ['email', 'name', 'password', 'realmId'],
            passwordMinLength: this.options.passwordMinLength,
        }));
        const validated = await validator.run(data, { group: 'create' });

        await this.repository.validateJoinColumns(validated);

        if (this.options.emailVerificationEnabled) {
            validated.active = false;
            validated.activateHash = randomBytes(32).toString('hex');
        } else {
            validated.active = true;
        }

        const entity = this.repository.create(validated);

        const credentialsService = new UserCredentialsService();
        entity.password = entity.password || createNanoID(64);
        entity.password = await credentialsService.protect(entity.password);

        const realm = await this.realmRepository.resolve(entity.realmId, true);
        entity.realmId = realm.id;

        await this.repository.save(entity);

        if (this.options.emailVerificationEnabled) {
            try {
                const activateUrl = this.options.publicUrl ?
                    `${this.options.publicUrl.replace(/\/+$/, '')}/activate?token=${entity.activateHash}` :
                    undefined;

                const mail = await this.mailTemplateRenderer.render({
                    template: MailTemplateName.REGISTRATION_ACTIVATION,
                    params: { code: entity.activateHash!, url: activateUrl },
                    locale: context?.locale,
                });

                await this.mailClient.send({
                    to: entity.email,
                    ...mail,
                });
            } catch {
                await this.repository.remove(entity);
                throw new ValidationError('Registration failed. Could not send activation email.');
            }
        }

        await this.eventService?.record({
            scope: EventScope.IDENTITY,
            name: EventName.REGISTER,
            refType: EventRefType.USER,
            refId: entity.id,
            actorType: IdentityType.USER,
            actorId: entity.id,
            actorName: entity.name,
            realmId: entity.realmId,
        });

        return { active: entity.active };
    }

    async activate(data: { token: string }): Promise<void> {
        const entity = await this.repository.findOneBy({ activateHash: data.token });

        if (!entity) {
            throw new EntityNotFoundError();
        }

        // Following the mailed code IS the proof of control over the address,
        // and it is the only place authup obtains one — which is why the claim
        // is stamped here rather than derived from `active` (#3519).
        const merged = this.repository.merge(entity, {
            active: true,
            activateHash: null,
            emailVerified: true,
        });

        await this.repository.save(merged);

        await this.eventService?.record({
            scope: EventScope.IDENTITY,
            name: EventName.ACCOUNT_ACTIVATED,
            refType: EventRefType.USER,
            refId: merged.id,
            actorType: IdentityType.USER,
            actorId: merged.id,
            actorName: merged.name,
            realmId: merged.realmId,
        });
    }
}
