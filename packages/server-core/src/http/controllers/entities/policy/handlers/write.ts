/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType } from '@authup/access';
import { isPropertySet, isUUID } from '@authup/kit';
import { BadRequestError, NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted, sendCreated } from 'routup';
import type { FindOptionsWhere } from 'typeorm';
import {
    isEntityUnique, useDataSource, validateEntityJoinColumns,
} from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { DatabaseConflictError } from '../../../../../database';
import {
    PolicyEntity, PolicyRepository,
} from '../../../../../database/domains';
import { PolicyValidator } from '../utils';
import {
    RequestHandlerOperation,
    getRequestBodyRealmID,
    getRequestParamID,
    isRequestIdentityMasterRealmMember,
    useRequestIdentityOrFail,
    useRequestPermissionChecker,
} from '../../../../request';

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

    const permissionChecker = useRequestPermissionChecker(req);
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

    // ----------------------------------------------

    let parent : PolicyEntity | undefined | null;
    if (isPropertySet(data, 'parent_id')) {
        if (data.parent_id) {
            parent = await repository.findOneWithEA({ where: { id: data.parent_id } });
            if (parent) {
                if (parent.type !== BuiltInPolicyType.COMPOSITE) {
                    throw new BadRequestError('The parent policy must be of type group.');
                }
            }
        } else {
            parent = null;
        }

        delete data.parent_id;
    }

    // ----------------------------------------------

    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: PolicyEntity,
    });

    if (typeof parent !== 'undefined') {
        data.parent = parent;
    }

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
        await permissionChecker.check({
            name: PermissionName.PERMISSION_UPDATE,
            data: {
                attributes: {
                    ...entity,
                    ...data,
                },
            },
        });
    } else {
        if (!data.realm_id) {
            const identity = useRequestIdentityOrFail(req);
            if (!isRequestIdentityMasterRealmMember(identity)) {
                data.realm_id = identity.realmId;
            }
        }

        await permissionChecker.check({
            name: PermissionName.PERMISSION_CREATE,
            data: {
                attributes: data,
            },
        });
    }

    // ----------------------------------------------

    if (entity) {
        const keys = Object.keys(data);
        for (let i = 0; i < keys.length; i++) {
            entity[keys[i]] = data[keys[i]];
        }

        await repository.saveOneWithEA(entity);
        await repository.findDescendantsTree(entity);

        return sendAccepted(res, entity);
    }

    await repository.saveOneWithEA(data);

    return sendCreated(res, data);
}
