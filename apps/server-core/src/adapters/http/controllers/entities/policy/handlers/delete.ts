/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { removeObjectProperty } from '@authup/kit';
import { PolicyEntity } from '../../../../../database/domains/index.ts';
import { useRequestParamID, useRequestPermissionChecker } from '../../../../request/index.ts';

export async function deletePolicyRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    const id = useRequestParamID(req);

    const permissionChecker = useRequestPermissionChecker(req);
    await permissionChecker.preCheck({ name: PermissionName.PERMISSION_DELETE });

    const dataSource = await useDataSource();
    const repository = dataSource.getTreeRepository(PolicyEntity);
    const entity = await repository.findOneBy({ id });

    if (!entity) {
        throw new NotFoundError();
    }

    await permissionChecker.check({
        name: PermissionName.PERMISSION_DELETE,
        input: new PolicyData({
            [BuiltInPolicyType.ATTRIBUTES]: entity,
        }),
    });

    const { id: entityId } = entity;

    await repository.remove(entity);

    entity.id = entityId;

    // todo: remove after PolicyEntity - parent delete on cascade
    removeObjectProperty(entity, 'children');

    return sendAccepted(res, entity);
}
