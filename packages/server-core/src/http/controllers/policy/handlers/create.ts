/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, isPropertySet } from '@authup/kit';
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
import { useRequestEnv } from '../../../utils';
import { buildRequestValidationErrorMessage } from '../../../validation';
import { PolicyRequestValidator } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function createPolicyRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (!ability.has(PermissionName.PERMISSION_ADD)) {
        throw new ForbiddenError();
    }

    const validator = new PolicyRequestValidator();

    const [data, attributes] = await validator.executeWithAttributes(req, {
        group: RequestHandlerOperation.CREATE,
    });

    if (isPropertySet(data, 'realm_id')) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.realm_id)) {
            throw new BadRequestError(buildRequestValidationErrorMessage('realm_id'));
        }
    }

    if (!data.realm_id) {
        const { id } = useRequestEnv(req, 'realm');
        data.realm_id = id;
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

    await repository.saveWithAttributes(entity, attributes);

    return sendCreated(res, entity);
}
