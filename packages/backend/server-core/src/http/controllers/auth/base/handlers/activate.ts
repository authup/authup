/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { NotFoundError } from '@ebec/http';
import { useDataSource } from 'typeorm-extension';
import { ExpressRequest, ExpressResponse } from '../../../../type';
import { ExpressValidationError, matchedValidationData } from '../../../../express-validation';
import { UserRepository } from '../../../../../domains';

export async function createAuthActivateRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    await check('token')
        .exists()
        .notEmpty()
        .isLength({ min: 3, max: 256 })
        .run(req);

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new ExpressValidationError(validation);
    }

    const data = matchedValidationData(req, { includeOptionals: true });

    // todo: log attempt ( token, ip_address, user_agent, created_at)

    const dataSource = await useDataSource();
    const repository = new UserRepository(dataSource);

    const entity = await repository.findOneBy({
        activate_hash: data.token,
    });

    if (!entity) {
        throw new NotFoundError();
    }

    entity.active = true;
    entity.activate_hash = null;

    await repository.save(entity);

    // todo: maybe redirect to appUrl

    return res.respond({
        data: entity,
    });
}
