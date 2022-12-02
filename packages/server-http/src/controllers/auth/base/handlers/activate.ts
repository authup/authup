/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { check, validationResult } from 'express-validator';
import { NotFoundError } from '@ebec/http';
import {
    Request, Response, sendAccepted,
} from 'routup';
import { useDataSource } from 'typeorm-extension';
import { UserRepository } from '@authelion/server-database';
import { RequestValidationError, matchedValidationData } from '../../../../validation';

export async function createAuthActivateRouteHandler(req: Request, res: Response) : Promise<any> {
    await check('token')
        .exists()
        .notEmpty()
        .isLength({ min: 3, max: 256 })
        .run(req);

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new RequestValidationError(validation);
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

    return sendAccepted(res, entity);
}
