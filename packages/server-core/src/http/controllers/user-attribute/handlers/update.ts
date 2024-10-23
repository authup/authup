/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { UserAttributeEntity } from '../../../../database/domains';
import { UserAttributeRequestValidator } from '../utils';
import {
    RequestHandlerOperation, useRequestParamID, useRequestPermissionChecker,
} from '../../../request';
import { canRequestManageUserAttribute } from '../utils/authorization';

export async function updateUserAttributeRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.checkOneOf({
        name: [

            PermissionName.USER_UPDATE,
            PermissionName.USER_SELF_MANAGE,
        ],
    });

    const id = useRequestParamID(req);

    const validator = new UserAttributeRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group: RequestHandlerOperation.UPDATE,
    });

    const dataSource = await useDataSource();
    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: UserAttributeEntity,
    });

    const repository = dataSource.getRepository(UserAttributeEntity);
    let entity = await repository.findOneBy({ id });
    if (!entity) {
        throw new NotFoundError();
    }

    entity = repository.merge(entity, data);

    const canAbility = await canRequestManageUserAttribute(req, entity);
    if (!canAbility) {
        throw new ForbiddenError();
    }

    await repository.save(entity);

    return sendAccepted(res, entity);
}
