/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@ebec/http';
import {
    PermissionName,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted, sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { RealmEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils/env';
import { runRealmValidation } from '../utils';
import { RequestHandlerOperation } from '../../../request/constants';

export async function createRealmRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (!ability.has(PermissionName.REALM_ADD)) {
        throw new ForbiddenError('You are not permitted to add a realm.');
    }

    const result = await runRealmValidation(req, RequestHandlerOperation.CREATE);
    if (!result.data) {
        return sendAccepted(res);
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(RealmEntity);

    const entity = repository.create(result.data);

    await repository.save(entity);

    return sendCreated(res, entity);
}
