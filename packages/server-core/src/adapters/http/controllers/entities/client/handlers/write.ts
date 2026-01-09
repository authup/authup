/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isUUID } from '@authup/kit';
import { NotFoundError } from '@ebec/http';
import { ClientValidator, PermissionName } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { sendAccepted, sendCreated } from 'routup';
import type { FindOptionsWhere } from 'typeorm';
import { isEntityUnique, useDataSource, validateEntityJoinColumns } from 'typeorm-extension';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import { ClientCredentialsService } from '../../../../../../core/index.ts';
import { DatabaseConflictError } from '../../../../../database/index.ts';
import { ClientEntity } from '../../../../../database/domains/index.ts';
import {
    RequestHandlerOperation,
    getRequestBodyRealmID,
    getRequestParamID,
    useRequestIdentityOrFail,
    useRequestPermissionChecker,
} from '../../../../request/index.ts';

export async function writeClientRouteHandler(
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
    const repository = dataSource.getRepository(ClientEntity);
    let entity : ClientEntity | null | undefined;
    if (id) {
        const where: FindOptionsWhere<ClientEntity> = {};
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
        await permissionChecker.preCheck({ name: PermissionName.CLIENT_UPDATE });

        group = RequestHandlerOperation.UPDATE;
    } else {
        await permissionChecker.preCheck({ name: PermissionName.CLIENT_CREATE });

        group = RequestHandlerOperation.CREATE;
    }

    const validator = new ClientValidator();
    const validatorAdapter = new RoutupContainerAdapter(validator);
    const data = await validatorAdapter.run(req, {
        group,
    });

    // ----------------------------------------------

    await validateEntityJoinColumns(data, {
        dataSource,
        entityTarget: ClientEntity,
    });

    const isUnique = await isEntityUnique({
        dataSource,
        entityTarget: ClientEntity,
        entity: data,
        entityExisting: entity || undefined,
    });

    if (!isUnique) {
        throw new DatabaseConflictError();
    }

    // ----------------------------------------------

    const credentialsService = new ClientCredentialsService();

    if (entity) {
        if (
            !data.realm_id &&
            !entity.realm_id
        ) {
            const identity = useRequestIdentityOrFail(req);
            data.realm_id = identity.realmId;
        }

        entity = repository.merge(entity, data);

        await permissionChecker.check({
            name: PermissionName.CLIENT_UPDATE,
            input: {
                attributes: entity,
            },
        });

        if (entity.is_confidential) {
            if (!data.secret && !entity.secret) {
                data.secret = credentialsService.generateSecret();
            }

            if (data.secret) {
                entity.secret = await credentialsService.protect(data.secret, entity);
            }
        } else {
            entity.secret = null;
        }

        await repository.save(entity);

        if (data.secret) {
            entity.secret = data.secret;
        }

        return sendAccepted(res, entity);
    }

    if (!data.realm_id) {
        const identity = useRequestIdentityOrFail(req);
        data.realm_id = identity.realmId;
    }

    await permissionChecker.check({
        name: PermissionName.CLIENT_CREATE,
        input: {
            attributes: data,
        },
    });

    entity = repository.create(data);

    if (entity.is_confidential) {
        if (!data.secret) {
            data.secret = credentialsService.generateSecret();
        }

        entity.secret = await credentialsService.protect(data.secret, data);
    } else {
        entity.secret = null;
    }

    await repository.save(entity);

    if (data.secret) {
        entity.secret = data.secret;
    }

    return sendCreated(res, entity);
}
