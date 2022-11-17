/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AbilityDescriptor, OAuth2Scope, OAuth2SubKind, transformOAuth2ScopeToArray,
} from '@authelion/common';
import { useDataSource } from 'typeorm-extension';
import { RobotRepository, UserRepository } from '../../domains';

export async function loadOAuth2SubPermissions(
    kind: `${OAuth2SubKind}`,
    id: string,
    scope?: string | string[],
) : Promise<AbilityDescriptor[]> {
    const scopes = transformOAuth2ScopeToArray(scope);

    // todo: grant permissions depending on scopes :)
    if (scopes.indexOf(OAuth2Scope.GLOBAL) === -1) {
        return [];
    }

    const dataSource = await useDataSource();

    switch (kind) {
        case OAuth2SubKind.USER: {
            const repository = new UserRepository(dataSource);
            return repository.getOwnedPermissions(id);
        }
        case OAuth2SubKind.ROBOT: {
            const repository = new RobotRepository(dataSource);
            return repository.getOwnedPermissions(id);
        }
    }

    // todo: reduce permissions based on scope :)

    return [];
}
