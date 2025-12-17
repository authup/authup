/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PasswordForgotResponse } from '@authup/core-http-kit';
import { User } from '@authup/core-kit';
import { BadRequestError, NotFoundError } from '@ebec/http';
import {
    DController, DPost, DRequest, DResponse,
} from '@routup/decorators';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { IMailClient } from '../../../../../core';
import { resolveRealm } from '../../../../database/domains';
import { PasswordForgotRequestValidator } from './validator';

export type PasswordForgotControllerOptions = {
    registration?: boolean,
    emailVerification?: boolean
};

export type PasswordForgotControllerContext = {
    options: PasswordForgotControllerOptions,
    mailClient: IMailClient,
    repository: Repository<User>
};

@DController('/password-forgot')
export class PasswordForgotController {
    protected options: PasswordForgotControllerOptions;

    protected repository: Repository<User>;

    protected mailClient: IMailClient;

    protected validator : RoutupContainerAdapter<User>;

    constructor(ctx: PasswordForgotControllerContext) {
        this.options = ctx.options;
        this.repository = ctx.repository;
        this.mailClient = ctx.mailClient;

        const validator = new PasswordForgotRequestValidator();
        this.validator = new RoutupContainerAdapter(validator);
    }

    @DPost('', [])
    async execute(
        @DRequest() req: Request,
            @DResponse() res: Response,
    ): Promise<PasswordForgotResponse> {
        if (!this.options.registration) {
            throw new BadRequestError('User registration is not enabled.');
        }

        if (!this.options.emailVerification) {
            throw new BadRequestError('Email verification is not enabled, but required to reset a password.');
        }

        const data = await this.validator.run(req);

        const where : FindOptionsWhere<User> = {
            ...(data.name ? { name: data.name } : {}),
            ...(data.email ? { email: data.email } : {}),
        };

        const realm = await resolveRealm(data.realm_id, true);
        where.realm_id = realm.id;

        const query = this.repository.createQueryBuilder('user');
        const entity = await query
            .addSelect('user.email')
            .where(where)
            .getOne();

        if (!entity) {
            throw new NotFoundError();
        }

        if (!entity.email) {
            // todo: throw validation error
            throw new BadRequestError('User has no email address.');
        }

        entity.reset_expires = new Date(Date.now() + (1000 * 60 * 30)).toISOString();
        entity.reset_hash = randomBytes(32).toString('hex');

        await this.repository.save(entity);

        await this.mailClient.send({
            to: entity.email,
            subject: 'Forgot Password - Reset code',
            html: `
            <p>Please use the code below to reset your account password.</p>
            <p>${entity.reset_hash}</p>
            `,
        });

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        return sendAccepted(res, {
            reset_expires: entity.reset_expires,
        });
    }
}
