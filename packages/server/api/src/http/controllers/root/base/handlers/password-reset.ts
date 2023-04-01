/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, oneOf, validationResult } from 'express-validator';
import type { User } from '@authup/core';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import type { FindOptionsWhere } from 'typeorm';
import { NotFoundError } from '@ebec/http';
import { useDataSource } from 'typeorm-extension';
import { UserRepository, resolveRealm } from '../../../../../domains';
import { RequestValidationError, matchedValidationData } from '../../../../validation';

export async function createAuthPasswordResetRouteHandler(req: Request, res: Response) : Promise<any> {
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

    await check('realm_id')
        .exists()
        .isUUID()
        .optional({ nullable: true })
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
        throw new RequestValidationError(validation);
    }

    const data = matchedValidationData(req, { includeOptionals: true }) as Partial<User> & { token: string };

    // todo: log attempt (email, token, ip_address, user_agent)

    const where : FindOptionsWhere<User> = {
        ...(data.name ? { name: data.name } : {}),
        ...(data.email ? { email: data.email } : {}),
        reset_hash: data.token,
    };

    const realm = await resolveRealm(data.realm_id, true);
    where.realm_id = realm.id;

    const dataSource = await useDataSource();
    const repository = new UserRepository(dataSource);

    const entity = await repository.findOneBy(where);
    if (!entity) {
        throw new NotFoundError();
    }

    entity.reset_at = new Date().toISOString();
    entity.reset_hash = null;
    entity.reset_expires = null;

    await repository.save(entity);

    return sendAccepted(res);
}
