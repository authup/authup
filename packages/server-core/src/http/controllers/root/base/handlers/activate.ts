/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { NotFoundError } from '@ebec/http';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { RequestValidator } from '../../../../../core';
import { UserRepository } from '../../../../../domains';

export class AuthActiveRequestValidator extends RequestValidator<{ token: string}> {
    constructor() {
        super();

        this.add('token')
            .exists()
            .notEmpty()
            .isLength({ min: 3, max: 256 });
    }
}

export async function createAuthActivateRouteHandler(req: Request, res: Response) : Promise<any> {
    const validator = new AuthActiveRequestValidator();
    const data = await validator.execute(req);

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
