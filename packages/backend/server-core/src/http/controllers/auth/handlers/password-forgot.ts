/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, NotFoundError, ServerError } from '@typescript-error/http';
import { check, oneOf, validationResult } from 'express-validator';
import { User, isValidUserName } from '@authelion/common';
import { FindOptionsWhere } from 'typeorm';
import { randomBytes } from 'crypto';
import { useConfig } from '../../../../config';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { ExpressValidationError, matchedValidationData } from '../../../express-validation';
import { useDataSource } from '../../../../database';
import { UserRepository } from '../../../../domains';

export async function createAuthPasswordForgotRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const config = await useConfig();

    if (!config.registration) {
        throw new ServerError('User registration is not enabled.');
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

    const entity = await repository.findOneBy(where);
    if (!entity) {
        throw new NotFoundError();
    }

    entity.reset_expires = new Date(Date.now() + (1000 * 60 * 30));
    entity.reset_hash = randomBytes(32).toString('hex');

    // todo: send email

    return res.respondAccepted();
}
