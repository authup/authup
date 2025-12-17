/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RegisterResponse } from '@authup/core-http-kit';
import { User } from '@authup/core-kit';
import { createNanoID } from '@authup/kit';
import { BadRequestError } from '@ebec/http';
import {
    DController, DPost, DRequest, DResponse,
} from '@routup/decorators';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import type { Repository } from 'typeorm';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { IMailClient, UserCredentialsService } from '../../../../../core';
import { UserEntity, resolveRealm } from '../../../../database/domains';
import { RequestHandlerOperation } from '../../../request';
import { RegisterRequestValidator } from './validator';

export type RegisterControllerOptions = {
    registration?: boolean,
    emailVerification?: boolean
};

export type RegisterControllerContext = {
    options: RegisterControllerOptions,
    mailClient: IMailClient,
    repository: Repository<User>
};

@DController('/register')
export class RegisterController {
    protected options: RegisterControllerOptions;

    protected mailClient: IMailClient;

    protected repository: Repository<User>;

    protected validator : RoutupContainerAdapter<User>;

    constructor(ctx: RegisterControllerContext) {
        this.options = ctx.options;
        this.mailClient = ctx.mailClient;
        this.repository = ctx.repository;

        const validator = new RegisterRequestValidator();
        this.validator = new RoutupContainerAdapter(validator);
    }

    @DPost('', [])
    async execute(
        @DRequest() req: Request,
            @DResponse() res: Response,
    ): Promise<RegisterResponse> {
        if (!this.options.registration) {
            throw new BadRequestError('User registration is not enabled.');
        }

        const data = await this.validator.run(req, {
            group: RequestHandlerOperation.CREATE,
        });

        // todo: remove this
        const dataSource = await useDataSource();
        await validateEntityJoinColumns(data, {
            dataSource,
            entityTarget: UserEntity,
        });

        if (!data.email) {
            // todo: validation error
            throw new BadRequestError('User email is required');
        }

        data.name ??= data.email;

        if (this.options.emailVerification) {
            data.active = false;
            data.activate_hash = randomBytes(32).toString('hex');
        } else {
            data.active = true;
        }

        const entity = this.repository.create(data);

        const credentialsService = new UserCredentialsService();
        entity.password = entity.password || createNanoID(64);
        entity.password = await credentialsService.protect(entity.password);

        const realm = await resolveRealm(entity.realm_id, true);
        entity.realm_id = realm.id;

        await this.repository.save(entity);

        if (this.options.emailVerification) {
            await this.mailClient.send({
                to: entity.email || data.email,
                subject: 'Registration - Activation code',
                html: `
                <p>Please use the code below to activate your account and start using the site.</p>
                <p>${entity.activate_hash}</p>
                `,
            });
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        return sendAccepted(res, {
            active: entity.active,
        });
    }
}
