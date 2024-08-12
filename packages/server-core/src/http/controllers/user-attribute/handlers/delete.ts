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
import { useDataSource } from 'typeorm-extension';
import { UserAttributeEntity } from '../../../../domains';
import { useRequestEnv, useRequestParamID } from '../../../request';
import { canRequestManageUserAttribute } from '../utils/authorization';

export async function deleteUserAttributeRouteHandler(req: Request, res: Response) : Promise<any> {
    const abilities = useRequestEnv(req, 'abilities');
    const hasAbility = await abilities.hasOneOf([
        PermissionName.USER_UPDATE,
        PermissionName.USER_SELF_MANAGE,
    ]);

    if (!hasAbility) {
        throw new ForbiddenError();
    }

    const id = useRequestParamID(req);

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserAttributeEntity);

    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    const canAbility = await canRequestManageUserAttribute(req, entity);
    if (!canAbility) {
        throw new ForbiddenError();
    }

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    return sendAccepted(res, entity);
}
