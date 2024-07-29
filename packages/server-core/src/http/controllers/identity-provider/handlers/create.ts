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
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { IdentityProviderEntity, IdentityProviderRepository } from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { useRequestEnv } from '../../../utils';
import { IdentityProviderAttributesValidator, IdentityProviderValidator } from '../utils';
import { RequestHandlerOperation } from '../../../request';

export async function createIdentityProviderRouteHandler(req: Request, res: Response) : Promise<any> {
    const ability = useRequestEnv(req, 'abilities');
    if (!await ability.has(PermissionName.IDENTITY_PROVIDER_CREATE)) {
        throw new ForbiddenError();
    }

    const validator = new RoutupContainerAdapter(new IdentityProviderValidator());
    const data = await validator.run(req, {
        group: RequestHandlerOperation.CREATE,
    });

    const attributesValidator = new RoutupContainerAdapter(new IdentityProviderAttributesValidator());
    const attributes = await attributesValidator.run(req);

    const dataSource = await useDataSource();
    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: IdentityProviderEntity,
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

    const repository = new IdentityProviderRepository(dataSource);

    const entity = repository.create(data);

    await repository.saveWithAttributes(entity, attributes);

    return sendCreated(res, entity);
}
