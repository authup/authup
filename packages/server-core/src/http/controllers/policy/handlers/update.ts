/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType } from '@authup/permitus';
import { isPropertySet } from '@authup/kit';
import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName, isRealmResourceWritable } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted } from 'routup';
import {
    getEntityPropertyNames, isEntityUnique, useDataSource, validateEntityJoinColumns,
} from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { DatabaseConflictError } from '../../../../database';
import { PolicyEntity, PolicyRepository } from '../../../../domains';
import { useRequestEnv } from '../../../utils';
import { PolicyAttributesValidator, PolicyValidator } from '../utils';
import { RequestHandlerOperation, useRequestParamID } from '../../../request';

export async function updatePolicyRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParamID(req);

    const ability = useRequestEnv(req, 'abilities');
    if (!await ability.has(PermissionName.PERMISSION_UPDATE)) {
        throw new ForbiddenError();
    }

    const validator = new RoutupContainerAdapter(new PolicyValidator());
    const data = await validator.run(req, {
        group: RequestHandlerOperation.UPDATE,
    });

    const dataSource = await useDataSource();
    const attributesValidator = new RoutupContainerAdapter(new PolicyAttributesValidator({
        attributeNames: await getEntityPropertyNames(PolicyEntity, dataSource),
    }));
    const attributes = await attributesValidator.run(req);

    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: PolicyEntity,
    });

    const repository = new PolicyRepository(dataSource);

    let entity = await repository.findOneBy({ id });
    if (!entity) {
        throw new NotFoundError();
    }

    const isUnique = await isEntityUnique({
        dataSource,
        entityTarget: PolicyEntity,
        entity: data,
        entityExisting: {
            id: entity.id,
        },
    });

    if (!isUnique) {
        throw new DatabaseConflictError();
    }

    entity = repository.merge(entity, data);

    if (isPropertySet(data, 'parent_id')) {
        if (data.parent_id) {
            const parent = await repository.findOneBy({ id: data.parent_id });
            if (parent) {
                if (parent.type !== BuiltInPolicyType.COMPOSITE) {
                    throw new BadRequestError('The parent policy must be of type group.');
                }
            }

            entity.parent = parent;
        } else {
            entity.parent = null;
        }
    }

    if (!isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.realm_id)) {
        throw new ForbiddenError();
    }

    if (!await ability.can(PermissionName.PERMISSION_UPDATE, { attributes: { ...entity, ...attributes } })) {
        throw new ForbiddenError();
    }

    await repository.saveWithAttributes(entity, attributes);

    return sendAccepted(res, entity);
}
