/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, isPropertySet } from '@authup/kit';
import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted, useRequestParam } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { enforceUniquenessForDatabaseEntity } from '../../../../database';
import { PolicyEntity, PolicyRepository } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { runPolicyProviderValidation } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function updatePolicyRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParam(req, 'id');

    const ability = useRequestEnv(req, 'abilities');
    if (!ability.has(PermissionName.PERMISSION_EDIT)) {
        throw new ForbiddenError();
    }

    const result = await runPolicyProviderValidation(req, RequestHandlerOperation.UPDATE);
    if (!result.data) {
        return sendAccepted(res);
    }

    const dataSource = await useDataSource();
    const repository = new PolicyRepository(dataSource);

    let entity = await repository.findOneBy({ id });
    if (!entity) {
        throw new NotFoundError();
    }

    await enforceUniquenessForDatabaseEntity(PolicyEntity, result.data, entity);

    if (isPropertySet(result.data, 'parent_id')) {
        if (result.data.parent_id) {
            const parent = await repository.findOneBy({ id: result.data.parent_id });
            if (parent) {
                if (parent.type !== BuiltInPolicyType.COMPOSITE) {
                    throw new BadRequestError('The parent policy must be of type group.');
                }
            }

            result.data.parent = parent;
        } else {
            result.data.parent = null;
        }
    }

    if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.realm_id)) {
        throw new ForbiddenError();
    }

    entity = repository.merge(entity, result.data);

    await repository.saveWithAttributes(entity, result.meta.attributes);

    return sendAccepted(res, entity);
}
