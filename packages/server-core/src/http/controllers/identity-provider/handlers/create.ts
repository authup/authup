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
import { IdentityProviderRepository } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { buildRequestValidationErrorMessage } from '../../../validation';
import { IdentityProviderRequestValidator } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function createIdentityProviderRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (!ability.has(PermissionName.PROVIDER_ADD)) {
        throw new ForbiddenError();
    }

    const validator = new IdentityProviderRequestValidator();
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

    const dataSource = await useDataSource();
    const repository = new IdentityProviderRepository(dataSource);

    const entity = repository.create(data);

    await repository.saveWithAttributes(entity, attributes);

    return sendCreated(res, entity);
}
