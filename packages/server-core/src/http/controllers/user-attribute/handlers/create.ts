/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ForbiddenError } from '@ebec/http';
import {
    PermissionName,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { UserAttributeEntity } from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { UserAttributeRequestValidator } from '../utils';
import { RequestHandlerOperation, useRequestEnv } from '../../../request';
import { canRequestManageUserAttribute } from '../utils/authorization';

export async function createUserAttributeRouteHandler(req: Request, res: Response) : Promise<any> {
    const permissionChecker = useRequestEnv(req, 'permissionChecker');
    await permissionChecker.preCheckOneOf({
        name: [
            PermissionName.USER_UPDATE,
            PermissionName.USER_SELF_MANAGE,
        ],
    });

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
    } else {
        const realmId = useRequestEnv(req, 'realmId');
        if (userId) {
            data.user_id = userId;
            data.realm_id = realmId;
        } else {
            throw new BadRequestError(buildErrorMessageForAttribute('user_id'));
        }
    }

    const repository = dataSource.getRepository(UserAttributeEntity);
    const entity = repository.create(data);

    const canAbility = await canRequestManageUserAttribute(
        req,
        entity,
    );
    if (!canAbility) {
        throw new ForbiddenError();
    }

    await repository.save(entity);

    return sendCreated(res, entity);
}
