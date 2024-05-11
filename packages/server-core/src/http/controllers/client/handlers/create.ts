/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isPropertySet } from '@authup/kit';
import { BadRequestError, ForbiddenError } from '@ebec/http';
import {
    PermissionName,
    isRealmResourceWritable,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { ClientEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { buildRequestValidationErrorMessage } from '../../../validation';
import { runOauth2ClientValidation } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function createClientRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (!ability.has(PermissionName.CLIENT_ADD)) {
        throw new ForbiddenError();
    }

    const result = await runOauth2ClientValidation(req, RequestHandlerOperation.CREATE);

    if (!isPropertySet(result.data, 'realm_id')) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'))) {
            throw new BadRequestError(buildRequestValidationErrorMessage('realm_id'));
        }
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(ClientEntity);

    result.data.user_id = useRequestEnv(req, 'userId');
    const provider = repository.create(result.data);

    await repository.save(provider);

    return sendCreated(res, provider);
}
