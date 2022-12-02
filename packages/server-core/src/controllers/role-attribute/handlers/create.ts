/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@ebec/http';
import {
    PermissionID,
    isPermittedForResourceRealm,
} from '@authelion/common';
import {
    Request, Response, sendAccepted, sendCreated,
} from 'routup';
import { useDataSource } from 'typeorm-extension';
import { useRequestEnv } from '../../../utils/env';
import { runRoleAttributeValidation } from '../utils';
import { RoleAttributeEntity } from '@authelion/server-database';
import { CRUDOperation } from '../../../constants';

export async function createRoleAttributeRouteHandler(req: Request, res: Response) : Promise<any> {
    const result = await runRoleAttributeValidation(req, CRUDOperation.CREATE);
    if (!result) {
        return sendAccepted(res);
    }

    const ability = useRequestEnv(req, 'ability');
    if (
        !ability.has(PermissionID.ROLE_EDIT) ||
        !isPermittedForResourceRealm(useRequestEnv(req, 'realmId'), result.data.realm_id)
    ) {
        throw new ForbiddenError('You are not permitted to set an attribute for this role...');
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RoleAttributeEntity);

    const entity = repository.create(result.data);

    await repository.save(entity);

    return sendCreated(res, entity);
}
