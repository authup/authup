/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@ebec/http';
import {
    PermissionID,
    isRealmResourceWritable,
} from '@authelion/common';
import {
    Request, Response, sendAccepted, sendCreated,
} from 'routup';
import { useDataSource } from 'typeorm-extension';
import { UserAttributeEntity } from '@authelion/server-database';
import { useRequestEnv } from '../../../utils/env';
import { runUserAttributeValidation } from '../utils';
import { CRUDOperation } from '../../../constants';

export async function createUserAttributeRouteHandler(req: Request, res: Response) : Promise<any> {
    const result = await runUserAttributeValidation(req, CRUDOperation.CREATE);
    if (!result) {
        return sendAccepted(res);
    }

    if (
        result.data.user_id !== useRequestEnv(req, 'userId')
    ) {
        if (
            !useRequestEnv(req, 'ability').has(PermissionID.USER_EDIT) ||
            !isRealmResourceWritable(useRequestEnv(req, 'realmId'), result.data.realm_id)
        ) {
            throw new ForbiddenError('You are not permitted to set an attribute for the given user...');
        }
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserAttributeEntity);

    const entity = repository.create(result.data);

    await repository.save(entity);

    return sendCreated(res, entity);
}
