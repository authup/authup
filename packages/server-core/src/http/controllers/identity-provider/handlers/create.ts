/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ForbiddenError } from '@ebec/http';
import {
    PermissionName,
    isRealmResourceWritable,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendCreated } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { IdentityProviderRepository } from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { useRequestEnv } from '../../../utils';
import { IdentityProviderRequestValidator } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function createIdentityProviderRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (!await ability.has(PermissionName.IDENTITY_PROVIDER_CREATE)) {
        throw new ForbiddenError();
    }

    const validator = new IdentityProviderRequestValidator();
    const [data, attributes] = await validator.executeWithAttributes(req, {
        group: RequestHandlerOperation.CREATE,
    });

    if (!data.realm_id) {
        const { id } = useRequestEnv(req, 'realm');
        data.realm_id = id;
    }

    if (!await ability.can(PermissionName.IDENTITY_PROVIDER_CREATE, { attributes: data })) {
        throw new ForbiddenError();
    }

    if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.realm_id)) {
        throw new BadRequestError(buildErrorMessageForAttribute('realm_id'));
    }

    const dataSource = await useDataSource();
    const repository = new IdentityProviderRepository(dataSource);

    const entity = repository.create(data);

    await repository.saveWithAttributes(entity, attributes);

    return sendCreated(res, entity);
}
