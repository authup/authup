/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2SubKind, OAuth2TokenPermission } from '@authup/security';
import { ScopeName, transformOAuth2ScopeToArray } from '@authup/core-kit';
import { useDataSource } from 'typeorm-extension';
import { IdentityPermissionService } from '../../../services';

export async function loadOAuth2SubPermissions(
    type: `${OAuth2SubKind}`,
    id: string,
    scope?: string | string[],
) : Promise<OAuth2TokenPermission[]> {
    const scopes = transformOAuth2ScopeToArray(scope);

    // todo: grant permissions depending on scopes :)
    if (scopes.indexOf(ScopeName.GLOBAL) === -1) {
        return [];
    }

    const dataSource = await useDataSource();
    const identityPermissionService = new IdentityPermissionService(dataSource);

    return identityPermissionService.getFor({
        type,
        id,
    });
}
