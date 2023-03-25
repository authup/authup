/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    PermissionName, REALM_MASTER_NAME, ROBOT_SYSTEM_NAME, RobotAPICommand, createNanoID, isRealmResourceWritable,
} from '@authup/common';
import { findRobotCredentialsInVault, hasVaultConfig, saveRobotCredentialsToVault } from '@authup/server-common';
import { RobotRepository } from '@authup/server-database';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '@ebec/http';
import { check, matchedData, validationResult } from 'express-validator';
import type { Request, Response } from 'routup';
import { sendAccepted, useRequestParam } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { isRequestAuthenticated } from '../../../middleware';
import { useRequestEnv } from '../../../utils';
import { RequestValidationError } from '../../../validation';

export async function handleRobotCommandRouteHandler(req: Request, res: Response) : Promise<any> {
    const id = useRequestParam(req, 'id');

    if (typeof id !== 'string') {
        throw new NotFoundError();
    }

    await check('command')
        .exists()
        .custom((command) => Object.values(RobotAPICommand).includes(command))
        .run(req);

    const validation = validationResult(req);
    if (!validation.isEmpty()) {
        throw new RequestValidationError(validation);
    }

    const validationData = matchedData(req, { includeOptionals: true }) as { command: RobotAPICommand };

    const dataSource = await useDataSource();
    const repository = new RobotRepository(dataSource);

    const entity = await repository.findOne({
        where: {
            id,
        },
        relations: ['realm'],
    });

    if (!entity) {
        throw new NotFoundError();
    }

    if (
        validationData.command !== RobotAPICommand.CHECK &&
        !isRequestAuthenticated(req)
    ) {
        throw new UnauthorizedError();
    }

    switch (validationData.command) {
        case RobotAPICommand.CHECK: {
            if (
                hasVaultConfig() &&
                entity.realm &&
                entity.realm.name === REALM_MASTER_NAME
            ) {
                const credentials = await findRobotCredentialsInVault({
                    name: ROBOT_SYSTEM_NAME,
                });

                if (!credentials) {
                    const secret = createNanoID(64);

                    entity.secret = await repository.hashSecret(secret);
                    await repository.save(entity);

                    await saveRobotCredentialsToVault({
                        ...entity,
                        secret,
                    });
                }
            }
            break;
        }
        case RobotAPICommand.RESET: {
            const ability = useRequestEnv(req, 'ability');
            if (
                !ability.has(PermissionName.ROBOT_EDIT) ||
                !isRealmResourceWritable(useRequestEnv(req, 'realm'), entity.realm_id)
            ) {
                throw new ForbiddenError();
            }

            if (
                hasVaultConfig() &&
                entity.realm &&
                entity.realm.name === REALM_MASTER_NAME
            ) {
                const secret = createNanoID(64);

                entity.secret = await repository.hashSecret(secret);
                await repository.save(entity);

                entity.secret = secret;

                await saveRobotCredentialsToVault(entity);
            }
        }
    }

    sendAccepted(res, entity);
}
