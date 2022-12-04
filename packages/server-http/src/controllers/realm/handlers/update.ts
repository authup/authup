/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError, NotFoundError } from '@ebec/http';

import { PermissionID } from '@authup/common';
import {
    Request, Response, send, sendAccepted, useRequestParam,
} from 'routup';
import { useDataSource } from 'typeorm-extension';
import { RealmEntity } from '@authup/server-database';
import { useRequestEnv } from '../../../utils/env';
import { runRealmValidation } from '../utils';
import { CRUDOperation } from '../../../constants';

export async function updateRealmRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const ability = useRequestEnv(req, 'ability');
    if (!ability.has(PermissionID.REALM_EDIT)) {
        throw new ForbiddenError('You are not permitted to edit a realm.');
    }

    const result = await runRealmValidation(req, CRUDOperation.UPDATE);
    if (!result.data) {
        return sendAccepted(res);
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RealmEntity);

    let entity = await repository.findOneBy({ id });
    if (!entity) {
        throw new NotFoundError();
    }

    entity = repository.merge(entity, result.data);

    await repository.save(entity);

    return sendAccepted(res, entity);
}
