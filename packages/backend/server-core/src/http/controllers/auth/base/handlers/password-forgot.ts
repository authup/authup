/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { NotFoundError, ServerError } from '@typescript-error/http';
import { check, oneOf, validationResult } from 'express-validator';
import { User } from '@authelion/common';
import { FindOptionsWhere } from 'typeorm';
import { randomBytes } from 'crypto';
import {
    useConfig,
} from '../../../../../config';
import { ExpressRequest, ExpressResponse } from '../../../../type';
import { ExpressValidationError, matchedValidationData } from '../../../../express-validation';
import { useDataSource } from '../../../../../database';
import { UserRepository } from '../../../../../domains';
import { useSMTPClient } from '../../../../../smtp';

export async function createAuthPasswordForgotRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const config = await useConfig();

    if (!config.registration) {
        throw new ServerError('User registration is not enabled.');
    }

    if (!config.emailVerification) {
        throw new ServerError('Email verification is not enabled, but required to reset a password.');
    }

    if (!config.smtp) {
        throw new ServerError('SMTP modul is not configured.');
    }

    await oneOf([
        check('email')
            .exists()
            .notEmpty()
            .isEmail(),
        check('name')
            .exists()
            .notEmpty()
            .isString(),
    ])
        .run(req);

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    const data : Partial<User> = matchedValidationData(req, { includeOptionals: true });

    const where : FindOptionsWhere<User> = {
        ...(data.name ? { name: data.name } : {}),
        ...(data.email ? { email: data.email } : {}),
    };

    const dataSource = await useDataSource();
    const repository = new UserRepository(dataSource);
    const query = repository.createQueryBuilder('user');
    const entity = await query
        .addSelect('user.email')
        .getOne();

    if (!entity) {
        throw new NotFoundError();
    }

    entity.reset_expires = new Date(Date.now() + (1000 * 60 * 30));
    entity.reset_hash = randomBytes(32).toString('hex');

    const smtpClient = await useSMTPClient();

    await smtpClient.sendMail({
        to: entity.email,
        subject: 'Forgot Password - Reset code',
        html: `
            <p>Please use the code below to reset your account password.</p>
            <p>${entity.reset_hash}</p>
            `,
    });

    return res.respondAccepted();
}
