/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { IdentityProviderEntity, IdentityProviderRepository } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { IdentityProviderAttributesValidator, IdentityProviderValidator } from '../utils';
import { RequestHandlerOperation, useRequestIDParam } from '../../../request';

export async function updateIdentityProviderRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestIDParam(req);

    const ability = useRequestEnv(req, 'abilities');
    if (!await ability.has(PermissionName.IDENTITY_PROVIDER_UPDATE)) {
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

    const repository = new IdentityProviderRepository(dataSource);

    let entity = await repository.findOneBy({ id });
    if (!entity) {
        throw new NotFoundError();
    }

    if (!await ability.can(PermissionName.IDENTITY_PROVIDER_UPDATE, { attributes: entity })) {
        throw new ForbiddenError();
    }

    if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.realm_id)) {
        throw new ForbiddenError();
    }

    entity = repository.merge(entity, data);

    await repository.saveWithAttributes(entity, attributes);

    return sendAccepted(res, entity);
}
