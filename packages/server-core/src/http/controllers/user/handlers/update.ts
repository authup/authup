/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted, useRequestParam } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { useConfig } from '../../../../config';
import { UserRepository } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { runUserValidation } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function updateUserRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const env = useRequestEnv(req);

    if (
        !env.abilities.has(PermissionName.USER_EDIT) &&
        env.userId !== id
    ) {
        throw new ForbiddenError('You are not authorized to modify a user.');
    }

    const result = await runUserValidation(req, RequestHandlerOperation.UPDATE);
    if (!result.data) {
        return sendAccepted(res);
    }

    const dataSource = await useDataSource();
    const repository = new UserRepository(dataSource);

    if (result.data.password) {
        result.data.password = await repository.hashPassword(result.data.password);
    }

    const query = repository.createQueryBuilder('user')
        .addSelect('user.email')
        .where('user.id = :id', { id });

    let entity = await query.getOne();
    if (!entity) {
        throw new NotFoundError();
    }

    if (!isRealmResourceWritable(env.realm, entity.realm_id)) {
        throw new ForbiddenError(`You are not allowed to edit users of the realm ${entity.realm_id}`);
    }

    if (
        result.data.name &&
        result.data.name !== entity.name
    ) {
        if (result.data.name_locked) {
            entity.name_locked = result.data.name_locked;
        }

        if (entity.name_locked) {
            delete result.data.name;
        }

        const config = useConfig();

        if (entity.name === config.userAdminName) {
            throw new BadRequestError('The default user name can not be changed.');
        }
    }

    entity = repository.merge(entity, result.data);

    await repository.save(entity);

    return sendAccepted(res, entity);
}
