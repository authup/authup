/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@ebec/http';
import {
    PermissionName,
    isRealmResourceWritable,
} from '@authup/common';
import {
    Request, Response, sendAccepted, sendCreated,
} from 'routup';
import { useDataSource } from 'typeorm-extension';
import { RoleAttributeEntity } from '@authup/server-database';
import { useRequestEnv } from '../../../utils/env';
import { runRoleAttributeValidation } from '../utils';
import { CRUDOperation } from '../../../constants';

export async function createRoleAttributeRouteHandler(req: Request, res: Response) : Promise<any> {
    const result = await runRoleAttributeValidation(req, CRUDOperation.CREATE);
    if (!result) {
        return sendAccepted(res);
    }

    const ability = useRequestEnv(req, 'ability');
    if (
        !ability.has(PermissionName.ROLE_EDIT) ||
        !isRealmResourceWritable(useRequestEnv(req, 'realm'), result.data.realm_id)
    ) {
        throw new ForbiddenError('You are not permitted to set an attribute for this role...');
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RoleAttributeEntity);

    const entity = repository.create(result.data);

    await repository.save(entity);

    return sendCreated(res, entity);
}
