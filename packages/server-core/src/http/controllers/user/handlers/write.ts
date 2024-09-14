/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isUUID } from '@authup/kit';
import { BadRequestError, NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted, sendCreated } from 'routup';
import type { FindOptionsWhere } from 'typeorm';
import { useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { useConfig } from '../../../../config';
import { UserEntity, UserRepository } from '../../../../domains';
import { UserRequestValidator } from '../utils';
import {
    RequestHandlerOperation, getRequestBodyRealmID, getRequestParamID, useRequestEnv,
} from '../../../request';

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
    let entity : UserEntity | undefined;
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

    let hasAbility : boolean;
    const permissionChecker = useRequestEnv(req, 'permissionChecker');
    if (entity) {
        try {
            await permissionChecker.preCheck({
                name: PermissionName.USER_UPDATE,
            });
            hasAbility = true;
        } catch (e) {
            if (entity.id !== useRequestEnv(req, 'userId')) {
                throw e;
            }
        }

        group = RequestHandlerOperation.UPDATE;
    } else {
        await permissionChecker.preCheck({
            name: PermissionName.USER_CREATE,
        });
        hasAbility = true;

        group = RequestHandlerOperation.CREATE;
    }

    const validator = new UserRequestValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group,
    });

    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: UserEntity,
    });

    if (!hasAbility) {
        delete data.name_locked;
        delete data.active;
        delete data.status;
        delete data.status_message;
    }

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
                delete data.name;
            }

            const config = useConfig();
            if (entity.name === config.userAdminName) {
                throw new BadRequestError('The default user name can not be changed.');
            }
        }

        if (hasAbility) {
            await permissionChecker.check({
                name: PermissionName.USER_UPDATE,
                data: {
                    attributes: {
                        ...entity,
                        ...data,
                    },
                },
            });
        }

        if (data.password) {
            entity.password = await repository.hashPassword(data.password);
        }

        await repository.save(entity);

        if (data.password) {
            entity.password = data.password;
        }

        return sendAccepted(res, entity);
    }

    if (!data.realm_id) {
        const { id } = useRequestEnv(req, 'realm');
        data.realm_id = id;
    }

    entity = repository.create(data);

    if (hasAbility) {
        await permissionChecker.check({
            name: PermissionName.USER_CREATE,
            data: {
                attributes: {
                    ...entity,
                    ...data,
                },
            },
        });
    }

    if (data.password) {
        entity.password = await repository.hashPassword(data.password);
    }

    await repository.save(entity);

    if (data.password) {
        entity.password = data.password;
    }

    return sendCreated(res, entity);
}
