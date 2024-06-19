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
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { enforceUniquenessForDatabaseEntity } from '../../../../database';
import { PolicyEntity, PolicyRepository } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { runPolicyProviderValidation } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function createPolicyRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (!ability.has(PermissionName.PERMISSION_ADD)) {
        throw new ForbiddenError();
    }

    const result = await runPolicyProviderValidation(req, RequestHandlerOperation.CREATE);

    await enforceUniquenessForDatabaseEntity(PolicyEntity, result.data);

    const dataSource = await useDataSource();
    const repository = new PolicyRepository(dataSource);

    const entity = repository.create(result.data);

    if (result.data.parent_id) {
        const parent = await repository.findOneBy({ id: result.data.parent_id });
        if (parent) {
            if (parent.type !== BuiltInPolicyType.COMPOSITE) {
                throw new BadRequestError('The parent policy must be of type composite.');
            }
        }

        result.data.parent = parent;
    }

    await repository.saveWithAttributes(entity, result.meta.attributes);

    return sendCreated(res, entity);
}
