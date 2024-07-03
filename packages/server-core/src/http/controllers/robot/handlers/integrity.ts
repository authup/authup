/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import {
    REALM_MASTER_NAME,
} from '@authup/core-kit';
import {
    createNanoID,
    isUUID,
} from '@authup/kit';
import { NotFoundError } from '@ebec/http';
import type { Request, Response } from 'routup';
import { sendAccepted, useRequestParam } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { isVaultClientUsable } from '@authup/server-kit';
import {
    RobotRepository,
    findRobotCredentialsInVault,
    resolveRealm,
    saveRobotCredentialsToVault,
} from '../../../../domains';
import { useRequestIDParam } from '../../../request';

export async function handleRobotIntegrityRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestIDParam(req, {
        strict: false,
    });

    const dataSource = await useDataSource();
    const repository = new RobotRepository(dataSource);
    const query = repository.createQueryBuilder('robot');

    let realm : Realm | undefined;

    if (isUUID(id)) {
        query.where('robot.id = :id', { id });
    } else {
        query.where('robot.name LIKE :name', { name: id });

        realm = await resolveRealm(useRequestParam(req, 'realmId'), true);
        query.andWhere('robot.realm_id = :realmId', { realmId: realm.id });
    }

    if (!realm) {
        query.leftJoinAndSelect('robot.realm', 'realm');
    }

    const entity = await query
        .addSelect('robot.secret')
        .getOne();

    if (!entity) {
        throw new NotFoundError();
    }

    if (entity.realm) {
        realm = entity.realm;
    }

    if (
        !isVaultClientUsable() ||
        !realm ||
        realm.name !== REALM_MASTER_NAME
    ) {
        return sendAccepted(res);
    }

    let refreshCredentials : boolean = false;
    if (entity.secret) {
        const credentials = await findRobotCredentialsInVault({
            name: entity.name,
        });

        if (credentials) {
            const secretHashedEqual = await repository.verifySecret(credentials.secret, entity.secret);
            if (!secretHashedEqual) {
                refreshCredentials = true;
            }
        } else {
            refreshCredentials = true;
        }
    } else {
        refreshCredentials = true;
    }

    if (refreshCredentials) {
        const secret = createNanoID(64);

        entity.secret = await repository.hashSecret(secret);
        await repository.save(entity);

        await saveRobotCredentialsToVault({
            ...entity,
            secret,
        });
    }

    return sendAccepted(res);
}
