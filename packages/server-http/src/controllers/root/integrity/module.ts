/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { REALM_MASTER_NAME, ROBOT_SYSTEM_NAME, createNanoID } from '@authup/common';
import { findRobotCredentialsInVault, hasVaultClient, saveRobotCredentialsToVault } from '@authup/server-common';
import { RealmEntity, RobotRepository } from '@authup/server-database';
import { sendAccepted } from 'routup';
import type { Request, Response } from 'routup';
import { useDataSource } from 'typeorm-extension';

export async function checkIntegrityRouteHandler(
    req: Request,
    res: Response,
) : Promise<any> {
    if (!hasVaultClient()) {
        sendAccepted(res);
        return;
    }

    const credentials = await findRobotCredentialsInVault({
        name: ROBOT_SYSTEM_NAME,
    });
    if (credentials) {
        sendAccepted(res);
        return;
    }

    const dataSource = await useDataSource();

    const realmRepository = dataSource.getRepository(RealmEntity);
    const realm = await realmRepository.findOne({
        where: {
            name: REALM_MASTER_NAME,
        },
    });

    const robotRepository = new RobotRepository(dataSource);
    const robot = await robotRepository.findOne({
        where: {
            name: ROBOT_SYSTEM_NAME,
            realm_id: realm.id,
        },
    });

    const secret = createNanoID(64);

    robot.secret = await robotRepository.hashSecret(secret);
    await robotRepository.save(robot);

    await saveRobotCredentialsToVault({
        ...robot,
        secret,
    });

    sendAccepted(res);
}
