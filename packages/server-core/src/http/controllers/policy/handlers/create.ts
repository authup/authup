/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType } from '@authup/kit';
import { BadRequestError, ForbiddenError } from '@ebec/http';
import {
    PermissionName,
    isRealmResourceWritable,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { enforceUniquenessForDatabaseEntity } from '../../../../database';
import { PolicyEntity, PolicyRepository } from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { useRequestEnv } from '../../../utils';
import { PolicyRequestValidator } from '../utils';
import { RequestHandlerOperation, isRequestMasterRealm } from '../../../request';

export async function createPolicyRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (!await ability.has(PermissionName.PERMISSION_CREATE)) {
        throw new ForbiddenError();
    }

    const validator = new PolicyRequestValidator();

    const [data, attributes] = await validator.executeWithAttributes(req, {
        group: RequestHandlerOperation.CREATE,
    });

    if (!data.realm_id && !isRequestMasterRealm(req)) {
        const { id } = useRequestEnv(req, 'realm');
        data.realm_id = id;
    }

    if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.realm_id)) {
        throw new BadRequestError(buildErrorMessageForAttribute('realm_id'));
    }

    await enforceUniquenessForDatabaseEntity(PolicyEntity, data);

    const dataSource = await useDataSource();
    const repository = new PolicyRepository(dataSource);

    const entity = repository.create(data);

    if (data.parent_id) {
        const parent = await repository.findOneBy({ id: data.parent_id });
        if (parent) {
            if (parent.type !== BuiltInPolicyType.COMPOSITE) {
                throw new BadRequestError('The parent policy must be of type composite.');
            }
        }

        data.parent = parent;
    }

    if (!await ability.can(PermissionName.PERMISSION_CREATE, { attributes: { ...entity, ...attributes } })) {
        throw new ForbiddenError();
    }

    await repository.saveWithAttributes(entity, attributes);

    return sendCreated(res, entity);
}
