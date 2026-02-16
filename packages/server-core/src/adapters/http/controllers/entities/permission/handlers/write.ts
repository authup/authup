/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { BadRequestError, NotFoundError } from '@ebec/http';
import { isPropertySet, isUUID } from '@authup/kit';
import {
    PermissionName, PermissionValidator, ROLE_ADMIN_NAME, ValidatorGroup,
} from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted, sendCreated } from 'routup';
import type { FindOptionsWhere } from 'typeorm';
import { IsNull } from 'typeorm';
import { isEntityUnique, useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { DatabaseConflictError } from '../../../../../database/index.ts';
import { PermissionEntity, RolePermissionEntity, RoleRepository } from '../../../../../database/domains/index.ts';
import {
    getRequestBodyRealmID,
    getRequestParamID,
    isRequestIdentityMasterRealmMember,
    useRequestIdentityOrFail,
    useRequestPermissionChecker,
} from '../../../../request/index.ts';

export async function writePermissionRouteHandler(
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
    const repository = dataSource.getRepository(PermissionEntity);
    let entity : PermissionEntity | null | undefined;
    if (id) {
        const where: FindOptionsWhere<PermissionEntity> = {};
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

        group = ValidatorGroup.UPDATE;
    } else {
        await permissionChecker.preCheck({ name: PermissionName.PERMISSION_CREATE });

        group = ValidatorGroup.CREATE;
    }

    const validator = new PermissionValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group,
    });

    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: PermissionEntity,
    });

    if (entity) {
        if (
            entity.built_in &&
            isPropertySet(data, 'name') &&
            entity.name !== data.name
        ) {
            throw new BadRequestError('The name of a built-in permission can not be changed.');
        }

        await permissionChecker.check({
            name: PermissionName.PERMISSION_UPDATE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: {
                    ...entity,
                    ...data,
                },
            }),
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
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: data,
            }),
        });
    }

    const isUnique = await isEntityUnique({
        dataSource,
        entityTarget: PermissionEntity,
        entity: data,
        entityExisting: entity || undefined,
    });

    if (!isUnique) {
        throw new DatabaseConflictError();
    }

    if (entity) {
        entity = repository.merge(entity, data);

        if (
            data.policy &&
            data.policy.realm_id &&
            entity.realm_id &&
            data.policy.realm_id !== entity.realm_id
        ) {
            throw new BadRequestError('Policy realm and permission realm must be equal.');
        }

        await repository.save(entity);

        return sendAccepted(res, entity);
    }

    if (
        data.policy &&
        data.policy.realm_id &&
        data.realm_id &&
        data.policy.realm_id !== data.realm_id
    ) {
        throw new BadRequestError('Policy realm and permission realm must be equal.');
    }

    entity = repository.create(data);

    await dataSource.transaction(async (entityManager) => {
        const transactionRepository = entityManager.getRepository(PermissionEntity);
        await transactionRepository.save(entity);

        const roleRepository = new RoleRepository(entityManager);
        const role = await roleRepository.findOneBy({
            name: ROLE_ADMIN_NAME,
            realm_id: IsNull(),
        });

        if (role) {
            const rolePermissionRepository = entityManager.getRepository(RolePermissionEntity);
            await rolePermissionRepository.insert({
                role_id: role.id,
                role_realm_id: role.realm_id,
                permission_id: entity.id,
                permission_realm_id: entity.realm_id,
            });

            await roleRepository.clearBoundPermissionsCache(role);
        }
    });

    return sendCreated(res, entity);
}
