/*
 * Copyright (c) 2022.
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
import { IdentityProviderRoleEntity } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { runIdentityProviderRoleValidation } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function createOauth2ProviderRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (!ability.has(PermissionName.PROVIDER_EDIT)) {
        throw new ForbiddenError();
    }

    const result = await runIdentityProviderRoleValidation(req, RequestHandlerOperation.CREATE);
    if (!result.data) {
        return sendAccepted(res);
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(IdentityProviderRoleEntity);

    const entity = repository.create(result.data);

    await repository.save(entity);

    return sendCreated(res, entity);
}
