/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, oneOf, validationResult } from 'express-validator';
import { User } from '@authelion/common';
import { FindOptionsWhere } from 'typeorm';
import { NotFoundError } from '@typescript-error/http';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { ExpressValidationError, matchedValidationData } from '../../../express-validation';
import { useDataSource } from '../../../../database';
import { UserRepository } from '../../../../domains';

export async function createAuthPasswordResetRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
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

    await check('token')
        .exists()
        .notEmpty()
        .isLength({ min: 3, max: 256 })
        .run(req);

    await check('password')
        .exists()
        .notEmpty()
        .isLength({ min: 5, max: 512 })
        .run(req);

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    const data = matchedValidationData(req, { includeOptionals: true }) as Partial<User> & { token: string };

    // todo: log attempt (email, token, ip_address, user_agent)

    const where : FindOptionsWhere<User> = {
        ...(data.name ? { name: data.name } : {}),
        ...(data.email ? { email: data.email } : {}),
        reset_hash: data.token,
    };

    const dataSource = await useDataSource();
    const repository = new UserRepository(dataSource);

    const entity = await repository.findOneBy(where);
    if (!entity) {
        throw new NotFoundError();
    }

    entity.reset_at = new Date();
    entity.reset_hash = null;
    entity.reset_expires = null;

    await repository.save(entity);

    return res.respondAccepted();
}
