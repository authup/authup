/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { BadRequestError, NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { UserRepository } from '../../../../../database/domains/index.ts';
import {
    useRequestIdentityOrFail, useRequestParamID, useRequestPermissionChecker,
} from '../../../../request/index.ts';

export async function deleteUserRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParamID(req);

    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheck({ name: PermissionName.USER_DELETE });

    const identity = useRequestIdentityOrFail(req);
    if (
        identity.type === 'user' &&
        identity.id === id
    ) {
        throw new BadRequestError('The own user can not be deleted.');
    }

    const dataSource = await useDataSource();
    const repository = new UserRepository(dataSource);
    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    await permissionChecker.check({
        name: PermissionName.USER_DELETE,
        input: new PolicyData({
            [BuiltInPolicyType.ATTRIBUTES]: entity,
        }),
    });

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    return sendAccepted(res, entity);
}
