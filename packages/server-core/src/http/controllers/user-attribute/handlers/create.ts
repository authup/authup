/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ForbiddenError } from '@ebec/http';
import {
    PermissionName,
    isRealmResourceWritable,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { UserAttributeEntity } from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { useRequestEnv } from '../../../utils';
import { UserAttributeRequestValidator } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function createUserAttributeRouteHandler(req: Request, res: Response) : Promise<any> {
    const validator = new UserAttributeRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);

    const data = await validatorAdapter.run(req, {
        group: RequestHandlerOperation.CREATE,
    });

    const dataSource = await useDataSource();
    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: UserAttributeEntity,
    });

    const userId = useRequestEnv(req, 'userId');
    if (data.user) {
        data.realm_id = data.user.realm_id;
        data.user_id = data.user.id;
    } else {
        const { id } = useRequestEnv(req, 'realm');
        data.realm_id = id;
        if (userId) {
            data.user_id = userId;
        } else {
            throw new BadRequestError(buildErrorMessageForAttribute('user_id'));
        }
    }

    const abilities = useRequestEnv(req, 'abilities');

    if (data.user_id !== userId) {
        if (
            !await abilities.has(PermissionName.USER_UPDATE) ||
            !isRealmResourceWritable(useRequestEnv(req, 'realm'), data.realm_id)
        ) {
            throw new ForbiddenError('You are not permitted to set an attribute for the given user...');
        }
    }

    const repository = dataSource.getRepository(UserAttributeEntity);

    const entity = repository.create(data);

    if (
        data.user_id !== userId &&
        !await abilities.can(PermissionName.USER_UPDATE, { attributes: entity })
    ) {
        throw new ForbiddenError();
    }

    await repository.save(entity);

    return sendCreated(res, entity);
}
