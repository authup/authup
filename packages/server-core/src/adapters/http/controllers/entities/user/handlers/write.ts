/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isUUID, removeObjectProperty } from '@authup/kit';
import { NotFoundError } from '@ebec/http';
import { PermissionName, UserValidator, ValidatorGroup } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted, sendCreated } from 'routup';
import type { FindOptionsWhere } from 'typeorm';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { UserEntity, UserRepository } from '../../../../../database/domains';
import {
    getRequestBodyRealmID,
    getRequestParamID,
    useRequestIdentityOrFail,
    useRequestPermissionChecker,
} from '../../../../request';
import { UserCredentialsService } from '../../../../../../core';

export async function writeUserRouteHandler(
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
    const repository = new UserRepository(dataSource);
    let entity : UserEntity | null | undefined;
    if (id) {
        const where: FindOptionsWhere<UserEntity> = {};
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

    let hasAbility : boolean | undefined;
    const permissionChecker = useRequestPermissionChecker(req);
    if (entity) {
        try {
            await permissionChecker.preCheck({
                name: PermissionName.USER_UPDATE,
            });
            hasAbility = true;
        } catch (e) {
            const identity = useRequestIdentityOrFail(req);
            if (identity.type !== 'user' || identity.id !== entity.id) {
                throw e;
            }
        }

        group = ValidatorGroup.UPDATE;
    } else {
        await permissionChecker.preCheck({
            name: PermissionName.USER_CREATE,
        });
        hasAbility = true;

        group = ValidatorGroup.CREATE;
    }

    const validator = new UserValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group,
    });

    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: UserEntity,
    });

    if (!hasAbility) {
        removeObjectProperty(data, 'name_locked');
        removeObjectProperty(data, 'active');
        removeObjectProperty(data, 'status');
        removeObjectProperty(data, 'status_message');
    }

    const credentialsService = new UserCredentialsService();

    if (entity) {
        entity = repository.merge(entity, data);

        if (
            data.name &&
            data.name !== entity.name
        ) {
            if (data.name_locked) {
                entity.name_locked = data.name_locked;
            }

            if (entity.name_locked) {
                removeObjectProperty(data, 'name');
            }
        }

        if (hasAbility) {
            await permissionChecker.check({
                name: PermissionName.USER_UPDATE,
                input: {
                    attributes: {
                        ...entity,
                        ...data,
                    },
                },
            });
        }

        if (data.password) {
            entity.password = await credentialsService.protect(data.password);
        }

        await repository.save(entity);

        if (data.password) {
            entity.password = data.password;
        }

        return sendAccepted(res, entity);
    }

    if (!data.realm_id) {
        const { realmId } = useRequestIdentityOrFail(req);
        data.realm_id = realmId;
    }

    entity = repository.create(data);

    if (hasAbility) {
        await permissionChecker.check({
            name: PermissionName.USER_CREATE,
            input: {
                attributes: {
                    ...entity,
                    ...data,
                },
            },
        });
    }

    if (data.password) {
        entity.password = await credentialsService.protect(data.password);
    }

    await repository.save(entity);

    if (data.password) {
        entity.password = data.password;
    }

    return sendCreated(res, entity);
}
