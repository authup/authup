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
import { sendAccepted } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { enforceUniquenessForDatabaseEntity } from '../../../../database';
import { PolicyEntity, PolicyRepository } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { PolicyRequestValidator } from '../utils';
import { RequestHandlerOperation, useRequestIDParam } from '../../../request';

export async function updatePolicyRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestIDParam(req);

    const ability = useRequestEnv(req, 'abilities');
    if (!ability.has(PermissionName.PERMISSION_UPDATE)) {
        throw new ForbiddenError();
    }

    const validator = new PolicyRequestValidator();

    const [data, attributes] = await validator.executeWithAttributes(req, {
        group: RequestHandlerOperation.UPDATE,
    });

    const dataSource = await useDataSource();
    const repository = new PolicyRepository(dataSource);

    let entity = await repository.findOneBy({ id });
    if (!entity) {
        throw new NotFoundError();
    }

    await enforceUniquenessForDatabaseEntity(PolicyEntity, data, entity);

    if (isPropertySet(data, 'parent_id')) {
        if (data.parent_id) {
            const parent = await repository.findOneBy({ id: data.parent_id });
            if (parent) {
                if (parent.type !== BuiltInPolicyType.COMPOSITE) {
                    throw new BadRequestError('The parent policy must be of type group.');
                }
            }

            data.parent = parent;
        } else {
            data.parent = null;
        }
    }

    if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.realm_id)) {
        throw new ForbiddenError();
    }

    entity = repository.merge(entity, data);

    if (!ability.can(PermissionName.PERMISSION_UPDATE, { attributes: { ...entity, ...attributes } })) {
        throw new ForbiddenError();
    }

    await repository.saveWithAttributes(entity, attributes);

    return sendAccepted(res, entity);
}
