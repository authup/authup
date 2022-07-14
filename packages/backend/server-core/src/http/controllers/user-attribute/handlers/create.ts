/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@typescript-error/http';
import {
    PermissionID,
    isPermittedForResourceRealm,
} from '@authelion/common';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { runUserAttributeValidation } from '../utils';
import { UserAttributeEntity } from '../../../../domains';
import { CRUDOperation } from '../../../constants';
import { useDataSource } from '../../../../database';

export async function createUserAttributeRouteHandler(req: ExpressRequest, res: ExpressResponse) : Promise<any> {
    const result = await runUserAttributeValidation(req, CRUDOperation.CREATE);
    if (!result) {
        return res.respondAccepted();
    }

    if (
        result.data.user_id !== req.userId
    ) {
        if (
            !req.ability.has(PermissionID.USER_EDIT) ||
            !isPermittedForResourceRealm(req.realmId, result.data.realm_id)
        ) {
            throw new ForbiddenError('You are not permitted to set an attribute for the given user...');
        }
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(UserAttributeEntity);

    const entity = repository.create(result.data);

    await repository.save(entity);

    return res.respondCreated({
        data: entity,
    });
}
