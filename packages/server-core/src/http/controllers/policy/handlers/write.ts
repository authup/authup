/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, isPropertySet, isUUID } from '@authup/kit';
import { BadRequestError, NotFoundError } from '@ebec/http';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted, sendCreated } from 'routup';
import type { FindOptionsWhere } from 'typeorm';
import {
    getEntityPropertyNames, isEntityUnique, useDataSource, validateEntityJoinColumns,
} from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { DatabaseConflictError } from '../../../../database';
import {
    PolicyEntity, PolicyRepository,
} from '../../../../domains';
import { buildErrorMessageForAttribute } from '../../../../utils';
import { PolicyAttributesValidator, PolicyValidator } from '../utils';
import {
    RequestHandlerOperation, getRequestBodyRealmID, getRequestParamID, isRequestMasterRealm, useRequestEnv,
} from '../../../request';

export async function writePolicyRouteHandler(
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
    const repository = new PolicyRepository(dataSource);
    let entity : PolicyEntity | undefined;
    if (id) {
        const where: FindOptionsWhere<PolicyEntity> = {};
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

    const permissionChecker = useRequestEnv(req, 'permissionChecker');
    if (entity) {
        await permissionChecker.preCheck({ name: PermissionName.PERMISSION_UPDATE });

        group = RequestHandlerOperation.UPDATE;
    } else {
        await permissionChecker.preCheck({ name: PermissionName.PERMISSION_CREATE });

        group = RequestHandlerOperation.CREATE;
    }

    // ----------------------------------------------

    const validator = new RoutupContainerAdapter(new PolicyValidator());
    const data = await validator.run(req, {
        group,
    });

    const attributesValidator = new RoutupContainerAdapter(new PolicyAttributesValidator({
        attributeNames: await getEntityPropertyNames(PolicyEntity, dataSource),
    }));
    const attributes = await attributesValidator.run(req);

    // ----------------------------------------------

    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: PolicyEntity,
    });

    // ----------------------------------------------

    const isUnique = await isEntityUnique({
        dataSource,
        entityTarget: PolicyEntity,
        entity: data,
        entityExisting: entity,
    });

    if (!isUnique) {
        throw new DatabaseConflictError();
    }

    // ----------------------------------------------
    if (entity) {
        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('realm_id'));
        }

        await permissionChecker.check({ name: PermissionName.PERMISSION_UPDATE, data: { attributes: data } });
    } else {
        if (!data.realm_id && !isRequestMasterRealm(req)) {
            const { id } = useRequestEnv(req, 'realm');
            data.realm_id = id;
        }

        if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), data.realm_id)) {
            throw new BadRequestError(buildErrorMessageForAttribute('realm_id'));
        }

        await permissionChecker.check({ name: PermissionName.PERMISSION_CREATE, data: { attributes: data } });
    }

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
