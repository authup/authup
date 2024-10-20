/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ScopeName } from '@authup/core-kit';
import type { BasicAuthorizationHeader } from 'hapic';
import type { Request } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { useConfig } from '../../../../config';
import { ClientRepository, RobotRepository, UserRepository } from '../../../../domains';
import { setRequestIdentity, setRequestScopes } from '../../../request';

export async function verifyBasicAuthorizationHeader(
    request: Request,
    header: BasicAuthorizationHeader,
) {
    const config = useConfig();
    const dataSource = await useDataSource();

    if (config.userAuthBasic) {
        const userRepository = new UserRepository(dataSource);
        const user = await userRepository.verifyCredentials(header.username, header.password);
        if (user) {
            await userRepository.findAndAppendExtraAttributesTo(user);
            setRequestScopes(request, [ScopeName.GLOBAL]);
            setRequestIdentity(request, {
                type: 'user',
                id: user.id,
                attributes: user,
                realmId: user.realm.id,
                realmName: user.realm.name,
            });

            return;
        }
    }

    if (config.robotAuthBasic) {
        const robotRepository = new RobotRepository(dataSource);
        const robot = await robotRepository.verifyCredentials(header.username, header.password);
        if (robot) {
            setRequestScopes(request, [ScopeName.GLOBAL]);
            setRequestIdentity(request, {
                type: 'robot',
                id: robot.id,
                attributes: robot,
                realmId: robot.realm.id,
                realmName: robot.realm.name,
            });
        }
    }

    if (config.clientAuthBasic) {
        const clientRepository = new ClientRepository(dataSource);
        const client = await clientRepository.verifyCredentials(header.username, header.password);
        if (client) {
            setRequestScopes(request, [ScopeName.GLOBAL]);
            setRequestIdentity(request, {
                type: 'client',
                id: client.id,
                attributes: client,
                realmId: client.realm.id,
                realmName: client.realm.name,
            });
        }
    }
}
