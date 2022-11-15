/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError } from '@ebec/http';
import {
    PermissionID,
} from '@authelion/common';
import {
    Request, Response, send, sendAccepted,
} from 'routup';
import { useDataSource } from 'typeorm-extension';
import { useRequestEnv } from '../../../utils';
import { runIdentityProviderRoleValidation } from '../utils';
import { IdentityProviderRoleEntity } from '../../../../domains';
import { CRUDOperation } from '../../../constants';

export async function createOauth2ProviderRoleRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'ability');
    if (!ability.has(PermissionID.PROVIDER_EDIT)) {
        throw new ForbiddenError();
    }

    const result = await runIdentityProviderRoleValidation(req, CRUDOperation.CREATE);
    if (!result.data) {
        return sendAccepted(res);
    }

    const dataSource = await useDataSource();
    const repository = dataSource.getRepository(IdentityProviderRoleEntity);

    const entity = repository.create(result.data);

    await repository.save(entity);

    return send(res, entity);
}
