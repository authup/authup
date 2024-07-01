/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { useConfig } from '../../../../config';
import { UserRepository } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { UserRequestValidator } from '../utils';
import { RequestHandlerOperation, useRequestIDParam } from '../../../request';

export async function updateUserRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestIDParam(req);

    const ability = useRequestEnv(req, 'abilities');
    const env = useRequestEnv(req);
    const hasAbility = await ability.has(PermissionName.USER_UPDATE);
    if (
        !hasAbility &&
        env.userId !== id
    ) {
        throw new ForbiddenError('You are not authorized to modify a user.');
    }

    const validator = new UserRequestValidator();
    const data = await validator.execute(req, {
        group: RequestHandlerOperation.UPDATE,
    });

    if (!hasAbility) {
        delete data.name_locked;
        delete data.active;
        delete data.status;
        delete data.status_message;
    }

    const dataSource = await useDataSource();
    const repository = new UserRepository(dataSource);

    if (data.password) {
        data.password = await repository.hashPassword(data.password);
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
        data.name &&
        data.name !== entity.name
    ) {
        if (data.name_locked) {
            entity.name_locked = data.name_locked;
        }

        if (entity.name_locked) {
            delete data.name;
        }

        const config = useConfig();

        if (entity.name === config.userAdminName) {
            throw new BadRequestError('The default user name can not be changed.');
        }
    }

    entity = repository.merge(entity, data);

    await repository.save(entity);

    return sendAccepted(res, entity);
}
