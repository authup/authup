/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isUUID } from '@authup/kit';
import { NotFoundError } from '@ebec/http';
import {
    IdentityProviderAttributesValidator, IdentityProviderValidator, PermissionName, ValidatorGroup,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted, sendCreated } from 'routup';
import type { FindOptionsWhere } from 'typeorm';
import { isEntityUnique, useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { IdentityProviderEntity, IdentityProviderRepository } from '../../../../../database/domains';
import {
    getRequestBodyRealmID, getRequestParamID, useRequestIdentityOrFail, useRequestPermissionChecker,
} from '../../../../request';
import { DatabaseConflictError } from '../../../../../database';

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
    let entity : IdentityProviderEntity | null | undefined;
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

    const permissionChecker = useRequestPermissionChecker(req);
    if (entity) {
        await permissionChecker.preCheck({ name: PermissionName.IDENTITY_PROVIDER_UPDATE });

        group = ValidatorGroup.UPDATE;
    } else {
        await permissionChecker.preCheck({ name: PermissionName.IDENTITY_PROVIDER_CREATE });

        group = ValidatorGroup.CREATE;
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
        await permissionChecker.check({
            name: PermissionName.IDENTITY_PROVIDER_UPDATE,
            input: {
                attributes: {
                    ...entity,
                    ...data,
                },
            },
        });
    } else {
        if (!data.realm_id) {
            const identity = useRequestIdentityOrFail(req);
            data.realm_id = identity.realmId;
        }

        await permissionChecker.check({
            name: PermissionName.IDENTITY_PROVIDER_CREATE,
            input: {
                attributes: data,
            },
        });
    }

    // ----------------------------------------------

    const isUnique = await isEntityUnique({
        dataSource,
        entityTarget: IdentityProviderEntity,
        entity: data,
        entityExisting: entity || undefined,
    });

    if (!isUnique) {
        throw new DatabaseConflictError();
    }

    // ----------------------------------------------

    if (entity) {
        entity = repository.merge(entity, data);
        await repository.saveOneWithEA(entity, attributes);

        return sendAccepted(res, entity);
    }

    entity = repository.create(data);
    await repository.saveOneWithEA(entity, attributes);

    return sendCreated(res, entity);
}
