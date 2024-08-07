/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isUUID } from '@authup/kit';
import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted, sendCreated } from 'routup';
import type { FindOptionsWhere } from 'typeorm';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { IdentityProviderEntity, IdentityProviderRepository } from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { useRequestEnv } from '../../../utils';
import { IdentityProviderAttributesValidator, IdentityProviderValidator } from '../utils';
import {
    RequestHandlerOperation, getRequestBodyRealmID, getRequestParamID,
} from '../../../request';

export async function writeIdentityProviderRouteHandler(
    req: Request,
    res: Response,
    options: {
        updateOnly?: boolean
    } = {},
) : Promise<any> {
    let group: string;
    const id = getRequestParamID(req, { isUUID: false });
    const realmId = getRequestBodyRealmID(req);

    const dataSource = await useDataSource();
    const repository = new IdentityProviderRepository(dataSource);
    let entity : IdentityProviderEntity | undefined;
    if (id) {
        const where: FindOptionsWhere<IdentityProviderEntity> = {};
        if (isUUID(id)) {
            where.id = id;
        } else {
            where.name = id;
        }

        if (realmId) {
            where.realm_id = realmId;
        }

        entity = await repository.findOneBy(where);
        if (!entity && options.updateOnly) {
            throw new NotFoundError();
        }
    } else if (options.updateOnly) {
        throw new NotFoundError();
    }

    const ability = useRequestEnv(req, 'abilities');
    if (entity) {
        if (!await ability.has(PermissionName.IDENTITY_PROVIDER_UPDATE)) {
            throw new ForbiddenError();
        }

        group = RequestHandlerOperation.UPDATE;
    } else {
        if (!await ability.has(PermissionName.IDENTITY_PROVIDER_CREATE)) {
            throw new ForbiddenError();
        }

        group = RequestHandlerOperation.CREATE;
    }

    // ----------------------------------------------

    const validator = new RoutupContainerAdapter(new IdentityProviderValidator());
    const data = await validator.run(req, {
        group,
    });

    const attributesValidator = new RoutupContainerAdapter(new IdentityProviderAttributesValidator());
    const attributes = await attributesValidator.run(req);

    // ----------------------------------------------

    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: IdentityProviderEntity,
    });

    // ----------------------------------------------

    if (entity) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('realm_id'));
        }

        if (!await ability.can(PermissionName.IDENTITY_PROVIDER_UPDATE, { attributes: data })) {
            throw new ForbiddenError();
        }
    } else {
        if (!data.realm_id) {
            const { id } = useRequestEnv(req, 'realm');
            data.realm_id = id;
        }

        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('realm_id'));
        }

        if (!await ability.can(PermissionName.IDENTITY_PROVIDER_CREATE, { attributes: data })) {
            throw new ForbiddenError();
        }
    }

    // ----------------------------------------------

    if (entity) {
        entity = repository.merge(entity, data);
        await repository.saveWithAttributes(entity, attributes);

        return sendAccepted(res, entity);
    }

    entity = repository.create(data);
    await repository.saveWithAttributes(entity, attributes);

    return sendCreated(res, entity);
}
