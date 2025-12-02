/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm, Robot } from '@authup/core-kit';
import {
    REALM_MASTER_NAME,
} from '@authup/core-kit';
import {
    isUUID,
} from '@authup/kit';
import { NotFoundError } from '@ebec/http';
import type { Request, Response } from 'routup';
import { sendAccepted, useRequestParam } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { isVaultClientUsable } from '@authup/server-kit';
import {
    RobotRepository,
    resolveRealm,

} from '../../../../../database/domains';
import { isRobotSynchronizationServiceUsable, useRobotSynchronizationService } from '../../../../../../services';
import { useRequestParamID } from '../../../../request';
import { RobotCredentialsService } from '../../../../../../services/credential/impl';

export async function handleRobotIntegrityRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParamID(req, {
        isUUID: false,
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

    const credentialsService = new RobotCredentialsService();

    let refreshCredentials : boolean = false;
    if (entity.secret) {
        let credentials : Pick<Robot, 'id' | 'secret' | 'name'> | undefined;
        if (isRobotSynchronizationServiceUsable()) {
            const robotSynchronizationService = useRobotSynchronizationService();
            credentials = await robotSynchronizationService.find({ name: entity.name });
        }

        if (credentials) {
            const secretHashedEqual = await credentialsService.verify(credentials.secret, entity);
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
        const secret = credentialsService.generateRawSecret();
        entity.secret = await credentialsService.protect(secret);
        await repository.save(entity);

        if (isRobotSynchronizationServiceUsable()) {
            const robotSynchronizationService = useRobotSynchronizationService();
            await robotSynchronizationService.save({
                ...entity,
                secret,
            });
        }
    }

    return sendAccepted(res);
}
